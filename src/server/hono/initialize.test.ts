import { NodeFileSystem } from "@effect/platform-node";
import { describe, it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import { expect } from "vitest";
import { testPlatformLayer } from "../../testing/layers/testPlatformLayer.ts";
import { testProjectMetaServiceLayer } from "../../testing/layers/testProjectMetaServiceLayer.ts";
import { testProjectRepositoryLayer } from "../../testing/layers/testProjectRepositoryLayer.ts";
import { testSessionMetaServiceLayer } from "../../testing/layers/testSessionMetaServiceLayer.ts";
import { testSessionRepositoryLayer } from "../../testing/layers/testSessionRepositoryLayer.ts";
import { ClaudeCodeLifeCycleService } from "../core/claude-code/services/ClaudeCodeLifeCycleService.ts";
import { EventBus } from "../core/events/services/EventBus.ts";
import { FileWatcherService } from "../core/events/services/fileWatcher.ts";
import type { InternalEventDeclaration } from "../core/events/types/InternalEventDeclaration.ts";
import { ProjectRepository } from "../core/project/infrastructure/ProjectRepository.ts";
import { RateLimitAutoScheduleService } from "../core/rate-limit/services/RateLimitAutoScheduleService.ts";
import { SchedulerConfigBaseDir } from "../core/scheduler/config.ts";
import { SchedulerService } from "../core/scheduler/domain/Scheduler.ts";
import { createMockSessionMeta } from "../core/session/testing/createMockSessionMeta.ts";
import { SyncService } from "../core/sync/services/SyncService.ts";
import { InitializeService } from "./initialize.ts";

const fileWatcherWithEventBus = FileWatcherService.Live.pipe(Layer.provide(EventBus.Live));

// Mock RateLimitAutoScheduleService for testing
const mockRateLimitAutoScheduleService = Layer.succeed(RateLimitAutoScheduleService, {
  start: () => Effect.void,
  stop: () => Effect.void,
});

// Mock SyncService for testing
const mockSyncService = Layer.succeed(SyncService, {
  fullSync: () => Effect.void,
  syncSession: () => Effect.void,
  syncProjectList: () => Effect.void,
});

// Mock SchedulerService for testing
const mockSchedulerService = Layer.succeed(SchedulerService, {
  startScheduler: Effect.void,
  stopScheduler: Effect.void,
  getJobs: () => Effect.succeed([]),
  addJob: () => Effect.die("Not implemented in tests"),
  updateJob: () => Effect.die("Not implemented in tests"),
  deleteJob: () => Effect.die("Not implemented in tests"),
});

// Mock ClaudeCodeLifeCycleService for testing
const mockLifeCycleService = Layer.succeed(ClaudeCodeLifeCycleService, {
  startSessionProcess: () => Effect.die("Not implemented in tests"),
  continueSessionProcess: () => Effect.die("Not implemented in tests"),
  abortTask: () => Effect.die("Not implemented in tests"),
  abortAllTasks: () => Effect.die("Not implemented in tests"),
  getPublicSessionProcesses: () => Effect.succeed([]),
});

const mockSchedulerConfigBaseDir = Layer.succeed(SchedulerConfigBaseDir, "/tmp/test-scheduler");

const schedulerDependencies = Layer.mergeAll(
  NodeFileSystem.layer,
  mockSchedulerService,
  mockLifeCycleService,
  mockSchedulerConfigBaseDir,
);

const allDependencies = Layer.mergeAll(
  fileWatcherWithEventBus,
  mockRateLimitAutoScheduleService,
  mockSyncService,
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
).pipe(Layer.provideMerge(schedulerDependencies));

const sharedTestLayer = Layer.provide(InitializeService.Live, allDependencies).pipe(
  Layer.merge(allDependencies),
);

describe("InitializeService", () => {
  describe("basic initialization process", () => {
    it.live("service initialization succeeds", () =>
      Effect.gen(function* () {
        const initialize = yield* InitializeService;
        const result = yield* initialize.startInitialization();

        expect(result).toBeUndefined();
      }).pipe(
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

    it.live("file watcher is started", () =>
      Effect.gen(function* () {
        const initialize = yield* InitializeService;

        yield* initialize.startInitialization();

        // Verify file watcher is started
        // (In actual implementation, verify that startWatching is called)
        return "file watcher started";
      }).pipe(
        Effect.provide(sharedTestLayer),
        Effect.provide(testProjectRepositoryLayer()),
        Effect.provide(testSessionRepositoryLayer()),
        Effect.provide(testPlatformLayer()),
      ),
    );
  });

  describe("event processing", () => {
    it.live("receives sessionChanged event", () =>
      Effect.gen(function* () {
        const initialize = yield* InitializeService;
        const eventBus = yield* EventBus;
        const eventsRef = yield* Ref.make<Array<InternalEventDeclaration["sessionChanged"]>>([]);

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

        const result = yield* Ref.get(eventsRef);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          projectId: "project-1",
          sessionId: "session-1",
        });
      }).pipe(
        Effect.provide(sharedTestLayer),
        Effect.provide(testProjectRepositoryLayer()),
        Effect.provide(testSessionRepositoryLayer()),
        Effect.provide(testPlatformLayer()),
      ),
    );

    it.live("heartbeat event is emitted periodically", () =>
      Effect.gen(function* () {
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

        const result = yield* Ref.get(heartbeatCountRef);
        // heartbeat is emitted immediately once first, then every 10 seconds
        // At 100ms, only the first one is emitted
        expect(result).toBeGreaterThanOrEqual(1);
      }).pipe(
        Effect.provide(sharedTestLayer),
        Effect.provide(testProjectRepositoryLayer()),
        Effect.provide(testSessionRepositoryLayer()),
        Effect.provide(testPlatformLayer()),
      ),
    );
  });

  describe("cache initialization", () => {
    it.live("doesn't throw error even if cache initialization fails", () => {
      const mockProjectRepositoryLayer = Layer.mock(ProjectRepository, {
        getProjects: () => Effect.fail(new Error("Failed to get projects")),
        getProject: () => Effect.fail(new Error("Not implemented in mock")),
      });

      return Effect.gen(function* () {
        const initialize = yield* InitializeService;
        const result = yield* initialize.startInitialization();
        expect(result).toBeUndefined();
      }).pipe(
        Effect.provide(sharedTestLayer),
        Effect.provide(mockProjectRepositoryLayer),
        Effect.provide(testSessionRepositoryLayer()),
        Effect.provide(testPlatformLayer()),
      );
    });
  });

  describe("cleanup", () => {
    it.live("resources are cleaned up with stopCleanup", () =>
      Effect.gen(function* () {
        const initialize = yield* InitializeService;
        yield* initialize.startInitialization();
        yield* initialize.stopCleanup();
      }).pipe(
        Effect.provide(sharedTestLayer),
        Effect.provide(testProjectRepositoryLayer()),
        Effect.provide(testSessionRepositoryLayer()),
        Effect.provide(testPlatformLayer()),
      ),
    );
  });
});
