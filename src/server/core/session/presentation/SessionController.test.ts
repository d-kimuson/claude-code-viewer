import { SystemError } from "@effect/platform/Error";
import { Effect, Layer } from "effect";
import { testFileSystemLayer } from "../../../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import { AgentSessionRepository } from "../../agent-session/infrastructure/AgentSessionRepository";
import { EventBus, type IEventBus } from "../../events/services/EventBus";
import type { InternalEventDeclaration } from "../../events/types/InternalEventDeclaration";
import { SessionRepository } from "../infrastructure/SessionRepository";
import { VirtualConversationDatabase } from "../infrastructure/VirtualConversationDatabase";
import { SessionMetaService } from "../services/SessionMetaService";
import { SessionController } from "./SessionController";

describe("SessionController", () => {
  describe("deleteSession", () => {
    const createTestLayers = (options: {
      fileExists?: boolean;
      removeSuccess?: boolean;
      onRemove?: (path: string) => void;
      onEmit?: <EventName extends keyof InternalEventDeclaration>(
        event: EventName,
        data: InternalEventDeclaration[EventName],
      ) => void;
    }) => {
      const {
        fileExists = true,
        removeSuccess = true,
        onRemove,
        onEmit,
      } = options;

      const projectPath = "/test/project";
      const projectId = Buffer.from(projectPath).toString("base64url");
      const sessionId = "test-session";
      const sessionPath = `${projectPath}/${sessionId}.jsonl`;

      const fileSystemLayer = testFileSystemLayer({
        exists: (path: string) =>
          Effect.succeed(path === sessionPath && fileExists),
        remove: (path: string) => {
          onRemove?.(path);
          if (removeSuccess) {
            return Effect.void;
          }
          return Effect.fail(
            new SystemError({
              method: "remove",
              reason: "Unknown",
              module: "FileSystem",
              cause: new Error("Permission denied"),
            }),
          );
        },
      });

      const sessionRepositoryLayer = Layer.succeed(SessionRepository, {
        getSession: () => Effect.succeed({ session: null }),
        getSessions: () => Effect.succeed({ sessions: [] }),
      });

      const agentSessionRepositoryLayer = Layer.succeed(
        AgentSessionRepository,
        {
          getAgentSessionByAgentId: () => Effect.succeed(null),
        },
      );

      const sessionMetaServiceLayer = Layer.succeed(SessionMetaService, {
        getSessionMeta: () =>
          Effect.succeed({
            messageCount: 0,
            firstUserMessage: null,
            cost: {
              totalUsd: 0,
              breakdown: {
                inputTokensUsd: 0,
                outputTokensUsd: 0,
                cacheCreationUsd: 0,
                cacheReadUsd: 0,
              },
              tokenUsage: {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
              },
            },
            modelName: null,
          }),
        invalidateSession: () => Effect.void,
      });

      const virtualConversationDatabaseLayer = Layer.succeed(
        VirtualConversationDatabase,
        {
          getProjectVirtualConversations: () => Effect.succeed([]),
          getSessionVirtualConversation: () => Effect.succeed(null),
          createVirtualConversation: () => Effect.void,
          deleteVirtualConversations: () => Effect.void,
        },
      );

      const eventBusLayer = Layer.succeed(EventBus, {
        emit: <EventName extends keyof InternalEventDeclaration>(
          event: EventName,
          data: InternalEventDeclaration[EventName],
        ) => {
          onEmit?.(event, data);
          return Effect.void;
        },
        on: () => Effect.void,
        off: () => Effect.void,
      } satisfies IEventBus);

      return {
        projectId,
        sessionId,
        sessionPath,
        layers: Layer.mergeAll(
          fileSystemLayer,
          sessionRepositoryLayer,
          sessionMetaServiceLayer,
          virtualConversationDatabaseLayer,
          eventBusLayer,
          agentSessionRepositoryLayer,
        ),
      };
    };

    it("successfully deletes a session file and returns 200", async () => {
      let removedPath: string | undefined;
      const { projectId, sessionId, sessionPath, layers } = createTestLayers({
        fileExists: true,
        removeSuccess: true,
        onRemove: (path) => {
          removedPath = path;
        },
      });

      const program = Effect.gen(function* () {
        const controller = yield* SessionController;
        return yield* controller.deleteSession({ projectId, sessionId });
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionController.Live),
          Effect.provide(layers),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.status).toBe(200);
      expect(result.response).toEqual({ success: true });
      expect(removedPath).toBe(sessionPath);
    });

    it("emits sessionListChanged event after successful deletion", async () => {
      const emittedEvents: Array<{
        event: keyof InternalEventDeclaration;
        data: InternalEventDeclaration[keyof InternalEventDeclaration];
      }> = [];
      const { projectId, sessionId, layers } = createTestLayers({
        fileExists: true,
        removeSuccess: true,
        onEmit: (event, data) => {
          emittedEvents.push({ event, data });
        },
      });

      const program = Effect.gen(function* () {
        const controller = yield* SessionController;
        return yield* controller.deleteSession({ projectId, sessionId });
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionController.Live),
          Effect.provide(layers),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(emittedEvents).toContainEqual({
        event: "sessionListChanged",
        data: { projectId },
      });
    });

    it("returns 404 when session file does not exist", async () => {
      const { projectId, sessionId, layers } = createTestLayers({
        fileExists: false,
      });

      const program = Effect.gen(function* () {
        const controller = yield* SessionController;
        return yield* controller.deleteSession({ projectId, sessionId });
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionController.Live),
          Effect.provide(layers),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.status).toBe(404);
      expect(result.response).toEqual({ error: "Session not found" });
    });

    it("returns 500 when file system error occurs during deletion", async () => {
      const { projectId, sessionId, layers } = createTestLayers({
        fileExists: true,
        removeSuccess: false,
      });

      const program = Effect.gen(function* () {
        const controller = yield* SessionController;
        return yield* controller.deleteSession({ projectId, sessionId });
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionController.Live),
          Effect.provide(layers),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.status).toBe(500);
      expect(result.response).toHaveProperty("error");
    });
  });
});
