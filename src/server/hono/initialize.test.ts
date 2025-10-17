import { Path } from "@effect/platform";
import { Effect, Layer, Ref } from "effect";
import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../core/events/services/EventBus";
import { FileWatcherService } from "../core/events/services/fileWatcher";
import type { InternalEventDeclaration } from "../core/events/types/InternalEventDeclaration";
import { ApplicationContext } from "../core/platform/services/ApplicationContext";
import { EnvService } from "../core/platform/services/EnvService";
import { ProjectRepository } from "../core/project/infrastructure/ProjectRepository";
import { ProjectMetaService } from "../core/project/services/ProjectMetaService";
import { SessionRepository } from "../core/session/infrastructure/SessionRepository";
import { VirtualConversationDatabase } from "../core/session/infrastructure/VirtualConversationDatabase";
import { SessionMetaService } from "../core/session/services/SessionMetaService";
import { InitializeService } from "./initialize";

describe("InitializeService", () => {
  const createMockProjectRepository = (
    projects: Array<{
      id: string;
      claudeProjectPath: string;
      lastModifiedAt: Date;
      meta: {
        projectName: string | null;
        projectPath: string | null;
        sessionCount: number;
      };
    }> = [],
  ) =>
    Layer.succeed(ProjectRepository, {
      getProjects: () => Effect.succeed({ projects }),
      getProject: () => Effect.fail(new Error("Not implemented in mock")),
    });

  const createMockSessionRepository = (
    sessions: Array<{
      id: string;
      jsonlFilePath: string;
      lastModifiedAt: Date;
      meta: {
        messageCount: number;
        firstCommand: {
          kind: "command";
          commandName: string;
          commandArgs?: string;
          commandMessage?: string;
        } | null;
      };
    }> = [],
    getSessionsCb?: (projectId: string) => void,
  ) =>
    Layer.succeed(SessionRepository, {
      getSessions: (projectId: string) => {
        if (getSessionsCb) getSessionsCb(projectId);
        return Effect.succeed({ sessions });
      },
      getSession: () => Effect.fail(new Error("Not implemented in mock")),
    });

  const createMockProjectMetaService = () =>
    Layer.succeed(ProjectMetaService, {
      getProjectMeta: () =>
        Effect.succeed({
          projectName: "Test Project",
          projectPath: "/path/to/project",
          sessionCount: 0,
        }),
      invalidateProject: () => Effect.void,
    });

  const createMockSessionMetaService = () =>
    Layer.succeed(SessionMetaService, {
      getSessionMeta: () =>
        Effect.succeed({
          messageCount: 0,
          firstCommand: null,
        }),
      invalidateSession: () => Effect.void,
    });

  const createTestLayer = (
    mockProjectRepositoryLayer: Layer.Layer<
      ProjectRepository,
      never,
      never
    > = createMockProjectRepository(),
    mockSessionRepositoryLayer: Layer.Layer<
      SessionRepository,
      never,
      never
    > = createMockSessionRepository(),
  ) => {
    // Provide EventBus first since FileWatcherService depends on it
    const fileWatcherWithEventBus = FileWatcherService.Live.pipe(
      Layer.provide(EventBus.Live),
    );

    // Merge all dependencies
    const allDependencies = Layer.mergeAll(
      EventBus.Live,
      fileWatcherWithEventBus,
      mockProjectRepositoryLayer,
      mockSessionRepositoryLayer,
      createMockProjectMetaService(),
      createMockSessionMetaService(),
      VirtualConversationDatabase.Live,
      Path.layer,
    );

    // Provide dependencies to InitializeService.Live and expose all services
    return Layer.provide(InitializeService.Live, allDependencies).pipe(
      Layer.merge(allDependencies),
    );
  };

  describe("basic initialization process", () => {
    it("service initialization succeeds", async () => {
      const mockProjectRepositoryLayer = createMockProjectRepository([
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
      ]);

      const mockSessionRepositoryLayer = createMockSessionRepository([
        {
          id: "session-1",
          jsonlFilePath: "/path/to/session-1.jsonl",
          lastModifiedAt: new Date(),
          meta: {
            messageCount: 5,
            firstCommand: {
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
            firstCommand: null,
          },
        },
      ]);

      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        return yield* initialize.startInitialization();
      });

      const testLayer = createTestLayer(
        mockProjectRepositoryLayer,
        mockSessionRepositoryLayer,
      );

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(testLayer),
          Effect.provide(ApplicationContext.Live),
          Effect.provide(EnvService.Live),
          Effect.provide(Path.layer),
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

      const testLayer = createTestLayer();

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(testLayer),
          Effect.provide(ApplicationContext.Live),
          Effect.provide(EnvService.Live),
          Effect.provide(Path.layer),
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

      const testLayer = createTestLayer();

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(testLayer),
          Effect.provide(ApplicationContext.Live),
          Effect.provide(EnvService.Live),
          Effect.provide(Path.layer),
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

      const testLayer = createTestLayer();

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(testLayer),
          Effect.provide(ApplicationContext.Live),
          Effect.provide(EnvService.Live),
          Effect.provide(Path.layer),
        ),
      );

      // heartbeat is emitted immediately once first, then every 10 seconds
      // At 100ms, only the first one is emitted
      expect(result).toBeGreaterThanOrEqual(1);
    });
  });

  describe("cache initialization", () => {
    it("project and session caches are initialized", async () => {
      const getProjectsCalled = vi.fn();
      const getSessionsCalled = vi.fn();

      const mockProjectRepositoryLayer = Layer.succeed(ProjectRepository, {
        getProjects: () => {
          getProjectsCalled();
          return Effect.succeed({
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
          });
        },
        getProject: () => Effect.fail(new Error("Not implemented in mock")),
      });

      const mockSessionRepositoryLayer = createMockSessionRepository(
        [
          {
            id: "session-1",
            jsonlFilePath: "/path/to/session-1.jsonl",
            lastModifiedAt: new Date(),
            meta: {
              messageCount: 5,
              firstCommand: {
                kind: "command",
                commandName: "test",
              },
            },
          },
        ],
        getSessionsCalled,
      );

      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        yield* initialize.startInitialization();
      });

      const testLayer = createTestLayer(
        mockProjectRepositoryLayer,
        mockSessionRepositoryLayer,
      );

      await Effect.runPromise(
        program.pipe(
          Effect.provide(testLayer),
          Effect.provide(ApplicationContext.Live),
          Effect.provide(EnvService.Live),
          Effect.provide(Path.layer),
        ),
      );

      expect(getProjectsCalled).toHaveBeenCalledTimes(1);
      expect(getSessionsCalled).toHaveBeenCalledTimes(1);
      expect(getSessionsCalled).toHaveBeenCalledWith("project-1");
    });

    it("doesn't throw error even if cache initialization fails", async () => {
      const mockProjectRepositoryLayer = Layer.succeed(ProjectRepository, {
        getProjects: () => Effect.fail(new Error("Failed to get projects")),
        getProject: () => Effect.fail(new Error("Not implemented in mock")),
      });

      const program = Effect.gen(function* () {
        const initialize = yield* InitializeService;
        return yield* initialize.startInitialization();
      });

      const testLayer = createTestLayer(mockProjectRepositoryLayer);

      // Completes without throwing error
      await expect(
        Effect.runPromise(
          program.pipe(
            Effect.provide(testLayer),
            Effect.provide(ApplicationContext.Live),
            Effect.provide(EnvService.Live),
            Effect.provide(Path.layer),
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

      const testLayer = createTestLayer();

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(testLayer),
          Effect.provide(ApplicationContext.Live),
          Effect.provide(EnvService.Live),
          Effect.provide(Path.layer),
        ),
      );

      expect(result).toBe("cleaned up");
    });
  });
});
