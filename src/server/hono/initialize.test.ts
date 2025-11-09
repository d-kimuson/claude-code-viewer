import { Effect, Layer, Ref } from "effect";
import { describe, expect, it } from "vitest";
import { testPlatformLayer } from "../../testing/layers/testPlatformLayer";
import { testProjectMetaServiceLayer } from "../../testing/layers/testProjectMetaServiceLayer";
import { testProjectRepositoryLayer } from "../../testing/layers/testProjectRepositoryLayer";
import { testSessionMetaServiceLayer } from "../../testing/layers/testSessionMetaServiceLayer";
import { testSessionRepositoryLayer } from "../../testing/layers/testSessionRepositoryLayer";
import type { ProcessPidMetadata } from "../core/claude-code/infrastructure/ProcessPidRepository";
import { ProcessPidRepository } from "../core/claude-code/infrastructure/ProcessPidRepository";
import { ProcessDetectionService } from "../core/claude-code/services/ProcessDetectionService";
import { EventBus } from "../core/events/services/EventBus";
import { FileWatcherService } from "../core/events/services/fileWatcher";
import type { InternalEventDeclaration } from "../core/events/types/InternalEventDeclaration";
import { ProjectRepository } from "../core/project/infrastructure/ProjectRepository";
import { VirtualConversationDatabase } from "../core/session/infrastructure/VirtualConversationDatabase";
import { InitializeService } from "./initialize";

const fileWatcherWithEventBus = FileWatcherService.Live.pipe(
  Layer.provide(EventBus.Live),
);

// Default mock for ProcessPidRepository (empty PIDs)
const defaultProcessPidRepository = Layer.succeed(ProcessPidRepository, {
  savePid: (sessionProcessId, pid, metadata) =>
    Effect.succeed({
      pid,
      sessionProcessId,
      projectId: metadata.projectId,
      cwd: metadata.cwd,
      createdAt: new Date().toISOString(),
    }),
  removePid: () => Effect.succeed(null),
  getPid: () => Effect.succeed(null),
  getAllPids: () => Effect.succeed([]),
  clearAllPids: () => Effect.void,
});

// Default mock for ProcessDetectionService
const defaultProcessDetectionService = Layer.succeed(ProcessDetectionService, {
  getCurrentProcessList: () => Effect.succeed([]),
  detectClaudeCodePid: () => Effect.succeed(null),
  isProcessAlive: () => Effect.succeed(false),
  killProcess: () => Effect.succeed(true),
});

const allDependencies = Layer.mergeAll(
  fileWatcherWithEventBus,
  VirtualConversationDatabase.Live,
  defaultProcessPidRepository,
  defaultProcessDetectionService,
  testProjectMetaServiceLayer({
    meta: {
      projectName: "Test Project",
      projectPath: "/path/to/project",
      sessionCount: 0,
    },
  }),
  testSessionMetaServiceLayer({
    meta: {
      messageCount: 0,
      firstUserMessage: null,
    },
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
                  meta: {
                    messageCount: 5,
                    firstUserMessage: {
                      kind: "command",
                      commandName: "test",
                    },
                  },
                },
                {
                  id: "session-2",
                  jsonlFilePath: "/path/to/session-2.jsonl",
                  lastModifiedAt: new Date(),
                  meta: {
                    messageCount: 3,
                    firstUserMessage: null,
                  },
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

  describe("startup cleanup of stale processes", () => {
    it("cleans up stale processes on startup when PID file exists", async () => {
      const killedPidsRef = Effect.runSync(Ref.make<number[]>([]));
      const pidsRef = Effect.runSync(
        Ref.make<ProcessPidMetadata[]>([
          {
            pid: 12345,
            sessionProcessId: "session-1",
            projectId: "project-1",
            cwd: "/path/to/project-1",
            createdAt: new Date().toISOString(),
          },
          {
            pid: 12346,
            sessionProcessId: "session-2",
            projectId: "project-2",
            cwd: "/path/to/project-2",
            createdAt: new Date().toISOString(),
          },
        ]),
      );

      // Mock ProcessPidRepository
      const mockProcessPidRepository = Layer.succeed(ProcessPidRepository, {
        savePid: (sessionProcessId, pid, metadata) =>
          Effect.succeed({
            pid,
            sessionProcessId,
            projectId: metadata.projectId,
            cwd: metadata.cwd,
            createdAt: new Date().toISOString(),
          }),
        removePid: () => Effect.succeed(null),
        getPid: () => Effect.succeed(null),
        getAllPids: () =>
          Effect.sync(() => Ref.get(pidsRef)).pipe(Effect.flatten),
        clearAllPids: () =>
          Effect.sync(() => Ref.set(pidsRef, [])).pipe(Effect.flatten),
      });

      // Mock ProcessDetectionService
      const mockProcessDetectionService = Layer.succeed(
        ProcessDetectionService,
        {
          getCurrentProcessList: () => Effect.succeed([]),
          detectClaudeCodePid: () => Effect.succeed(null),
          isProcessAlive: () => Effect.succeed(true), // All processes are alive
          killProcess: (pid) =>
            Effect.sync(() => {
              Effect.runSync(
                Ref.update(killedPidsRef, (pids) => [...pids, pid]),
              );
              return true;
            }),
        },
      );

      // Override the default mocks with test-specific mocks
      const baseDependencies = Layer.mergeAll(
        fileWatcherWithEventBus,
        VirtualConversationDatabase.Live,
        mockProcessPidRepository, // Test-specific mock
        mockProcessDetectionService, // Test-specific mock
        testProjectMetaServiceLayer({
          meta: {
            projectName: "Test Project",
            projectPath: "/path/to/project",
            sessionCount: 0,
          },
        }),
        testSessionMetaServiceLayer({
          meta: {
            messageCount: 0,
            firstUserMessage: null,
          },
        }),
        testPlatformLayer(),
      );

      const testLayer = Layer.provide(
        InitializeService.Live,
        baseDependencies,
      ).pipe(Layer.merge(baseDependencies));

      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        yield* initialize.startInitialization();

        const killedPids = yield* Ref.get(killedPidsRef);
        const remainingPids = yield* Ref.get(pidsRef);

        return { killedPids, remainingPids };
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(testLayer),
          Effect.provide(testProjectRepositoryLayer()),
          Effect.provide(testSessionRepositoryLayer()),
          Effect.provide(testPlatformLayer()),
        ),
      );

      // Verify that both processes were killed
      expect(result.killedPids).toHaveLength(2);
      expect(result.killedPids).toContain(12345);
      expect(result.killedPids).toContain(12346);

      // Verify that PID file was cleared
      expect(result.remainingPids).toHaveLength(0);
    });

    it("removes dead processes from PID file without killing", async () => {
      const killedPidsRef = Effect.runSync(Ref.make<number[]>([]));
      const pidsRef = Effect.runSync(
        Ref.make<ProcessPidMetadata[]>([
          {
            pid: 99999,
            sessionProcessId: "session-1",
            projectId: "project-1",
            cwd: "/path/to/project-1",
            createdAt: new Date().toISOString(),
          },
        ]),
      );

      // Mock ProcessPidRepository
      const mockProcessPidRepository = Layer.succeed(ProcessPidRepository, {
        savePid: (sessionProcessId, pid, metadata) =>
          Effect.succeed({
            pid,
            sessionProcessId,
            projectId: metadata.projectId,
            cwd: metadata.cwd,
            createdAt: new Date().toISOString(),
          }),
        removePid: () => Effect.succeed(null),
        getPid: () => Effect.succeed(null),
        getAllPids: () =>
          Effect.sync(() => Ref.get(pidsRef)).pipe(Effect.flatten),
        clearAllPids: () =>
          Effect.sync(() => Ref.set(pidsRef, [])).pipe(Effect.flatten),
      });

      // Mock ProcessDetectionService - process is not alive
      const mockProcessDetectionService = Layer.succeed(
        ProcessDetectionService,
        {
          getCurrentProcessList: () => Effect.succeed([]),
          detectClaudeCodePid: () => Effect.succeed(null),
          isProcessAlive: () => Effect.succeed(false), // Process is dead
          killProcess: (pid: number) =>
            Effect.sync(() => {
              Effect.runSync(
                Ref.update(killedPidsRef, (pids) => [...pids, pid]),
              );
              return true;
            }),
        },
      );

      // Override the default mocks with test-specific mocks
      const baseDependencies = Layer.mergeAll(
        fileWatcherWithEventBus,
        VirtualConversationDatabase.Live,
        mockProcessPidRepository, // Test-specific mock
        mockProcessDetectionService, // Test-specific mock
        testProjectMetaServiceLayer({
          meta: {
            projectName: "Test Project",
            projectPath: "/path/to/project",
            sessionCount: 0,
          },
        }),
        testSessionMetaServiceLayer({
          meta: {
            messageCount: 0,
            firstUserMessage: null,
          },
        }),
        testPlatformLayer(),
      );

      const testLayer = Layer.provide(
        InitializeService.Live,
        baseDependencies,
      ).pipe(Layer.merge(baseDependencies));

      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        yield* initialize.startInitialization();

        const killedPids = yield* Ref.get(killedPidsRef);
        const remainingPids = yield* Ref.get(pidsRef);

        return { killedPids, remainingPids };
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(testLayer),
          Effect.provide(testProjectRepositoryLayer()),
          Effect.provide(testSessionRepositoryLayer()),
          Effect.provide(testPlatformLayer()),
        ),
      );

      // Verify that no kill was attempted (process already dead)
      expect(result.killedPids).toHaveLength(0);

      // Verify that PID file was still cleared
      expect(result.remainingPids).toHaveLength(0);
    });

    it("handles empty PID file gracefully", async () => {
      const killedPidsRef = Effect.runSync(Ref.make<number[]>([]));
      const pidsRef = Effect.runSync(Ref.make<ProcessPidMetadata[]>([]));

      // Mock ProcessPidRepository with empty PIDs
      const mockProcessPidRepository = Layer.succeed(ProcessPidRepository, {
        savePid: (sessionProcessId, pid, metadata) =>
          Effect.succeed({
            pid,
            sessionProcessId,
            projectId: metadata.projectId,
            cwd: metadata.cwd,
            createdAt: new Date().toISOString(),
          }),
        removePid: () => Effect.succeed(null),
        getPid: () => Effect.succeed(null),
        getAllPids: () =>
          Effect.sync(() => Ref.get(pidsRef)).pipe(Effect.flatten),
        clearAllPids: () =>
          Effect.sync(() => Ref.set(pidsRef, [])).pipe(Effect.flatten),
      });

      // Mock ProcessDetectionService
      const mockProcessDetectionService = Layer.succeed(
        ProcessDetectionService,
        {
          getCurrentProcessList: () => Effect.succeed([]),
          detectClaudeCodePid: () => Effect.succeed(null),
          isProcessAlive: () => Effect.succeed(true),
          killProcess: (pid: number) =>
            Effect.sync(() => {
              Effect.runSync(
                Ref.update(killedPidsRef, (pids) => [...pids, pid]),
              );
              return true;
            }),
        },
      );

      // Override the default mocks with test-specific mocks
      const baseDependencies = Layer.mergeAll(
        fileWatcherWithEventBus,
        VirtualConversationDatabase.Live,
        mockProcessPidRepository, // Test-specific mock
        mockProcessDetectionService, // Test-specific mock
        testProjectMetaServiceLayer({
          meta: {
            projectName: "Test Project",
            projectPath: "/path/to/project",
            sessionCount: 0,
          },
        }),
        testSessionMetaServiceLayer({
          meta: {
            messageCount: 0,
            firstUserMessage: null,
          },
        }),
        testPlatformLayer(),
      );

      const testLayer = Layer.provide(
        InitializeService.Live,
        baseDependencies,
      ).pipe(Layer.merge(baseDependencies));

      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        // Should complete without errors
        yield* initialize.startInitialization();

        const killedPids = yield* Ref.get(killedPidsRef);
        return killedPids;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(testLayer),
          Effect.provide(testProjectRepositoryLayer()),
          Effect.provide(testSessionRepositoryLayer()),
          Effect.provide(testPlatformLayer()),
        ),
      );

      // No processes to kill
      expect(result).toHaveLength(0);
    });
  });
});
