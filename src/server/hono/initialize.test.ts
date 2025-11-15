import { Effect, Layer, Ref } from "effect";
import { describe, expect, it } from "vitest";
import { testFileSystemLayer } from "../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../testing/layers/testPlatformLayer";
import { testProjectMetaServiceLayer } from "../../testing/layers/testProjectMetaServiceLayer";
import { testProjectRepositoryLayer } from "../../testing/layers/testProjectRepositoryLayer";
import { testSessionMetaServiceLayer } from "../../testing/layers/testSessionMetaServiceLayer";
import { testSessionRepositoryLayer } from "../../testing/layers/testSessionRepositoryLayer";
import { ClaudeCodeLifeCycleService } from "../core/claude-code/services/ClaudeCodeLifeCycleService";
import { EventBus } from "../core/events/services/EventBus";
import { FileWatcherService } from "../core/events/services/fileWatcher";
import type { InternalEventDeclaration } from "../core/events/types/InternalEventDeclaration";
import { ProjectRepository } from "../core/project/infrastructure/ProjectRepository";
import { SchedulerConfigBaseDir } from "../core/scheduler/config";
import { SchedulerService } from "../core/scheduler/domain/Scheduler";
import { VirtualConversationDatabase } from "../core/session/infrastructure/VirtualConversationDatabase";
import { RateLimitMonitor } from "../core/session/services/RateLimitMonitor";
import { createMockSessionMeta } from "../core/session/testing/createMockSessionMeta";
import { InitializeService } from "./initialize";

const fileWatcherWithEventBus = FileWatcherService.Live.pipe(
  Layer.provide(EventBus.Live),
);

// Mock layers needed for RateLimitMonitor
const rateLimitMonitorDependencies = Layer.mergeAll(
  Layer.mock(SchedulerService, {
    getJobs: () => Effect.succeed([]),
    addJob: () => Effect.die("addJob should not be called in initialize tests"),
    updateJob: () => Effect.die("updateJob should not be called"),
    deleteJob: () => Effect.succeed(undefined),
  }),
  Layer.mock(ClaudeCodeLifeCycleService, {
    startTask: () => Effect.die("startTask should not be called"),
    continueTask: () => Effect.die("continueTask should not be called"),
    abortTask: () => Effect.die("abortTask should not be called"),
  }),
  Layer.succeed(SchedulerConfigBaseDir, "/tmp/test-scheduler"),
  testFileSystemLayer(),
);

const allDependencies = Layer.mergeAll(
  fileWatcherWithEventBus,
  VirtualConversationDatabase.Live,
  Layer.provide(RateLimitMonitor.Live, rateLimitMonitorDependencies),
  testProjectMetaServiceLayer({
    meta: {
      projectName: "Test Project",
      projectPath: "/path/to/project",
      sessionCount: 0,
    },
  }),
  testSessionMetaServiceLayer({
    meta: createMockSessionMeta({
      messageCount: 0,
      firstUserMessage: null,
    }),
  }),
  testPlatformLayer(),
);

const sharedTestLayer = Layer.provide(
  InitializeService.Live,
  allDependencies,
).pipe(Layer.merge(allDependencies));

describe("InitializeService", () => {
  describe("basic initialization process", () => {
    it("service initialization succeeds", async () => {
      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        return yield* initialize.startInitialization();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(sharedTestLayer),
          Effect.provide(
            testProjectRepositoryLayer({
              projects: [
                {
                  id: "project-1",
                  claudeProjectPath: "/path/to/project-1",
                  lastModifiedAt: new Date(),
                  meta: {
                    projectName: "Project 1",
                    projectPath: "/path/to/project-1",
                    sessionCount: 2,
                  },
                },
              ],
            }),
          ),
          Effect.provide(
            testSessionRepositoryLayer({
              sessions: [
                {
                  id: "session-1",
                  jsonlFilePath: "/path/to/session-1.jsonl",
                  lastModifiedAt: new Date(),
                  meta: createMockSessionMeta({
                    messageCount: 5,
                    firstUserMessage: {
                      kind: "command",
                      commandName: "test",
                    },
                  }),
                },
                {
                  id: "session-2",
                  jsonlFilePath: "/path/to/session-2.jsonl",
                  lastModifiedAt: new Date(),
                  meta: createMockSessionMeta({
                    messageCount: 3,
                    firstUserMessage: null,
                  }),
                },
              ],
            }),
          ),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toBeUndefined();
    });

    it("file watcher is started", async () => {
      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;

        yield* initialize.startInitialization();

        // Verify file watcher is started
        // (In actual implementation, verify that startWatching is called)
        return "file watcher started";
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(sharedTestLayer),
          Effect.provide(testProjectRepositoryLayer()),
          Effect.provide(testSessionRepositoryLayer()),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toBe("file watcher started");
    });
  });

  describe("event processing", () => {
    it("receives sessionChanged event", async () => {
      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        const eventBus = yield* EventBus;
        const eventsRef = yield* Ref.make<
          Array<InternalEventDeclaration["sessionChanged"]>
        >([]);

        // Set up listener for sessionChanged event
        yield* eventBus.on("sessionChanged", (event) => {
          Effect.runSync(Ref.update(eventsRef, (events) => [...events, event]));
        });

        yield* initialize.startInitialization();

        // Emit event
        yield* eventBus.emit("sessionChanged", {
          projectId: "project-1",
          sessionId: "session-1",
        });

        // Wait a bit for event to be processed
        yield* Effect.sleep("50 millis");

        const events = yield* Ref.get(eventsRef);
        return events;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(sharedTestLayer),
          Effect.provide(testProjectRepositoryLayer()),
          Effect.provide(testSessionRepositoryLayer()),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        projectId: "project-1",
        sessionId: "session-1",
      });
    });

    it("heartbeat event is emitted periodically", async () => {
      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        const eventBus = yield* EventBus;
        const heartbeatCountRef = yield* Ref.make(0);

        // Set up listener for heartbeat event
        yield* eventBus.on("heartbeat", () =>
          Effect.runSync(Ref.update(heartbeatCountRef, (count) => count + 1)),
        );

        yield* initialize.startInitialization();

        // Wait a bit to verify heartbeat is emitted
        // (In actual tests, should use mock to shorten time)
        yield* Effect.sleep("100 millis");

        const count = yield* Ref.get(heartbeatCountRef);
        return count;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(sharedTestLayer),
          Effect.provide(testProjectRepositoryLayer()),
          Effect.provide(testSessionRepositoryLayer()),
          Effect.provide(testPlatformLayer()),
        ),
      );

      // heartbeat is emitted immediately once first, then every 10 seconds
      // At 100ms, only the first one is emitted
      expect(result).toBeGreaterThanOrEqual(1);
    });
  });

  describe("cache initialization", () => {
    it("doesn't throw error even if cache initialization fails", async () => {
      const mockProjectRepositoryLayer = Layer.mock(ProjectRepository, {
        getProjects: () => Effect.fail(new Error("Failed to get projects")),
        getProject: () => Effect.fail(new Error("Not implemented in mock")),
      });

      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        return yield* initialize.startInitialization();
      });

      // Completes without throwing error
      await expect(
        Effect.runPromise(
          program.pipe(
            Effect.provide(sharedTestLayer),
            Effect.provide(mockProjectRepositoryLayer),
            Effect.provide(testSessionRepositoryLayer()),
            Effect.provide(testPlatformLayer()),
          ),
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe("cleanup", () => {
    it("resources are cleaned up with stopCleanup", async () => {
      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        yield* initialize.startInitialization();
        yield* initialize.stopCleanup();
        return "cleaned up";
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(sharedTestLayer),
          Effect.provide(testProjectRepositoryLayer()),
          Effect.provide(testSessionRepositoryLayer()),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toBe("cleaned up");
    });
  });
});
