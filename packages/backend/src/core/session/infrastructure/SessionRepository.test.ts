import type {
  Conversation,
  ErrorJsonl,
} from "@claude-code-viewer/shared/conversation-schema/index";
import { SystemError } from "@effect/platform/Error";
import { Effect, Layer, Option } from "effect";
import {
  createFileInfo,
  testFileSystemLayer,
} from "../../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../../testing/layers/testPlatformLayer";
import { decodeProjectId } from "../../project/functions/id";
import type { SessionDetail, SessionMeta } from "../../types";
import { SessionRepository } from "../infrastructure/SessionRepository";
import { VirtualConversationDatabase } from "../infrastructure/VirtualConversationDatabase";
import { SessionMetaService } from "../services/SessionMetaService";

const testSessionMetaServiceLayer = (meta: SessionMeta) => {
  return Layer.mock(SessionMetaService, {
    getSessionMeta: () => Effect.succeed(meta),
    invalidateSession: () => Effect.void,
  });
};

const testPredictSessionsDatabaseLayer = (
  sessions: Map<string, SessionDetail>,
) => {
  return Layer.mock(VirtualConversationDatabase, {
    getProjectVirtualConversations: (projectId: string) =>
      Effect.succeed(
        Array.from(sessions.values())
          .filter((s) => {
            const projectPath = decodeProjectId(projectId);
            return s.jsonlFilePath.startsWith(projectPath);
          })
          .map((s) => ({
            projectId,
            sessionId: s.id,
            conversations: s.conversations,
          })),
      ),
    getSessionVirtualConversation: (sessionId: string) => {
      const session = sessions.get(sessionId);
      return Effect.succeed(
        session
          ? {
              projectId: "",
              sessionId: session.id,
              conversations: session.conversations,
            }
          : null,
      );
    },
  });
};

describe("SessionRepository", () => {
  describe("getSession", () => {
    it("returns session details when session file exists", async () => {
      const projectId = Buffer.from("/test/project").toString("base64url");
      const sessionId = "test-session";
      const sessionPath = `/test/project/${sessionId}.jsonl`;
      const mockDate = new Date("2024-01-01T00:00:00.000Z");
      const mockMeta: SessionMeta = {
        messageCount: 3,
        firstUserMessage: null,
      };

      const mockContent = `{"type":"user","message":{"role":"user","content":"Hello"}}\n{"type":"assistant","message":{"role":"assistant","content":"Hi"}}\n{"type":"user","message":{"role":"user","content":"Test"}}`;

      const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);
      const PredictSessionsDatabaseMock = testPredictSessionsDatabaseLayer(
        new Map(),
      );

      const program = Effect.gen(function* () {
        const repo = yield* SessionRepository;
        return yield* repo.getSession(projectId, sessionId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(PredictSessionsDatabaseMock),
          Effect.provide(
            testFileSystemLayer({
              exists: (path: string) => Effect.succeed(path === sessionPath),
              readFileString: (path: string) =>
                path === sessionPath
                  ? Effect.succeed(mockContent)
                  : Effect.fail(
                      new SystemError({
                        method: "readFileString",
                        reason: "NotFound",
                        module: "FileSystem",
                        cause: undefined,
                      }),
                    ),
              stat: () =>
                Effect.succeed(
                  createFileInfo({
                    type: "File",
                    mtime: Option.some(mockDate),
                  }),
                ),
            }),
          ),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.session).not.toBeNull();
      if (result.session) {
        expect(result.session.id).toBe(sessionId);
        expect(result.session.jsonlFilePath).toBe(sessionPath);
        expect(result.session.meta).toEqual(mockMeta);
        expect(result.session.conversations).toHaveLength(3);
        expect(result.session.lastModifiedAt).toEqual(mockDate);
      }
    });

    it("returns predicted session when session file does not exist but predicted session exists", async () => {
      const projectId = Buffer.from("/test/project").toString("base64url");
      const sessionId = "predict-session";
      const mockDate = new Date("2024-01-01T00:00:00.000Z");

      const mockConversations: (Conversation | ErrorJsonl)[] = [
        {
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: mockDate.toISOString(),
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId,
          version: "1.0.0",
          parentUuid: null,
        },
      ];

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(false),
      });

      const SessionMetaServiceMock = testSessionMetaServiceLayer({
        messageCount: 0,
        firstUserMessage: null,
      });
      const PredictSessionsDatabaseMock = Layer.succeed(
        VirtualConversationDatabase,
        {
          getProjectVirtualConversations: () => Effect.succeed([]),
          getSessionVirtualConversation: (sid: string) =>
            Effect.succeed(
              sid === sessionId
                ? {
                    projectId,
                    sessionId,
                    conversations: mockConversations,
                  }
                : null,
            ),
          createVirtualConversation: () => Effect.void,
          deleteVirtualConversations: () => Effect.void,
        },
      );

      const program = Effect.gen(function* () {
        const repo = yield* SessionRepository;
        return yield* repo.getSession(projectId, sessionId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(PredictSessionsDatabaseMock),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.session).not.toBeNull();
      if (result.session) {
        expect(result.session.id).toBe(sessionId);
        expect(result.session.conversations).toHaveLength(1);
      }
    });

    it("returns null when session does not exist", async () => {
      const projectId = Buffer.from("/test/project").toString("base64url");
      const sessionId = "nonexistent-session";

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(false),
      });

      const SessionMetaServiceMock = testSessionMetaServiceLayer({
        messageCount: 0,
        firstUserMessage: null,
      });
      const PredictSessionsDatabaseMock = testPredictSessionsDatabaseLayer(
        new Map(),
      );

      const program = Effect.gen(function* () {
        const repo = yield* SessionRepository;
        return yield* repo.getSession(projectId, sessionId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(PredictSessionsDatabaseMock),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.session).toBeNull();
    });

    it("returns null when resuming session without predict session (reproduces bug)", async () => {
      const projectId = Buffer.from("/test/project").toString("base64url");
      const sessionId = "resume-session-id";

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(false),
      });

      const SessionMetaServiceMock = testSessionMetaServiceLayer({
        messageCount: 0,
        firstUserMessage: null,
      });
      const PredictSessionsDatabaseMock = testPredictSessionsDatabaseLayer(
        new Map(),
      );

      const program = Effect.gen(function* () {
        const repo = yield* SessionRepository;
        return yield* repo.getSession(projectId, sessionId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(PredictSessionsDatabaseMock),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.session).toBeNull();
    });
  });

  describe("getSessions", () => {
    it("returns list of sessions within project", async () => {
      const projectPath = "/test/project";
      const projectId = Buffer.from(projectPath).toString("base64url");
      const date1 = new Date("2024-01-01T00:00:00.000Z");
      const date2 = new Date("2024-01-02T00:00:00.000Z");

      const mockMeta: SessionMeta = {
        messageCount: 1,
        firstUserMessage: null,
      };

      const FileSystemMock = testFileSystemLayer({
        exists: (path: string) => Effect.succeed(path === projectPath),
        readDirectory: (path: string) =>
          path === projectPath
            ? Effect.succeed(["session1.jsonl", "session2.jsonl"])
            : Effect.succeed([]),
        stat: (path: string) => {
          if (path.includes("session1.jsonl")) {
            return Effect.succeed(
              createFileInfo({ type: "File", mtime: Option.some(date2) }),
            );
          }
          if (path.includes("session2.jsonl")) {
            return Effect.succeed(
              createFileInfo({ type: "File", mtime: Option.some(date1) }),
            );
          }
          return Effect.succeed(
            createFileInfo({ type: "File", mtime: Option.some(new Date()) }),
          );
        },
      });

      const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);
      const PredictSessionsDatabaseMock = testPredictSessionsDatabaseLayer(
        new Map(),
      );

      const program = Effect.gen(function* () {
        const repo = yield* SessionRepository;
        return yield* repo.getSessions(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(PredictSessionsDatabaseMock),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions.at(0)?.lastModifiedAt).toEqual(date2);
      expect(result.sessions.at(1)?.lastModifiedAt).toEqual(date1);
    });

    it("can limit number of results with maxCount option", async () => {
      const projectPath = "/test/project";
      const projectId = Buffer.from(projectPath).toString("base64url");
      const mockDate = new Date("2024-01-01T00:00:00.000Z");

      const mockMeta: SessionMeta = {
        messageCount: 1,
        firstUserMessage: null,
      };

      const FileSystemMock = testFileSystemLayer({
        exists: (path: string) => Effect.succeed(path === projectPath),
        readDirectory: (path: string) =>
          path === projectPath
            ? Effect.succeed([
                "session1.jsonl",
                "session2.jsonl",
                "session3.jsonl",
              ])
            : Effect.succeed([]),
        stat: () =>
          Effect.succeed(createFileInfo({ mtime: Option.some(mockDate) })),
      });

      const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);
      const PredictSessionsDatabaseMock = testPredictSessionsDatabaseLayer(
        new Map(),
      );

      const program = Effect.gen(function* () {
        const repo = yield* SessionRepository;
        return yield* repo.getSessions(projectId, { maxCount: 2 });
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(PredictSessionsDatabaseMock),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessions).toHaveLength(2);
    });

    it("can paginate with cursor option", async () => {
      const projectPath = "/test/project";
      const projectId = Buffer.from(projectPath).toString("base64url");
      const mockDate = new Date("2024-01-01T00:00:00.000Z");

      const mockMeta: SessionMeta = {
        messageCount: 1,
        firstUserMessage: null,
      };

      const FileSystemMock = testFileSystemLayer({
        exists: (path: string) => Effect.succeed(path === projectPath),
        readDirectory: (path: string) =>
          path === projectPath
            ? Effect.succeed([
                "session1.jsonl",
                "session2.jsonl",
                "session3.jsonl",
              ])
            : Effect.succeed([]),
        stat: () =>
          Effect.succeed(createFileInfo({ mtime: Option.some(mockDate) })),
      });

      const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);
      const PredictSessionsDatabaseMock = testPredictSessionsDatabaseLayer(
        new Map(),
      );

      const program = Effect.gen(function* () {
        const repo = yield* SessionRepository;
        return yield* repo.getSessions(projectId, {
          cursor: "session1",
        });
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(PredictSessionsDatabaseMock),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessions.length).toBeGreaterThan(0);
      expect(result.sessions.every((s) => s.id !== "session1")).toBe(true);
    });

    it("returns empty array when project does not exist", async () => {
      const projectId = Buffer.from("/nonexistent").toString("base64url");

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(false),
        readDirectory: () =>
          Effect.fail(
            new SystemError({
              method: "readDirectory",
              reason: "NotFound",
              module: "FileSystem",
              cause: undefined,
            }),
          ),
      });

      const SessionMetaServiceMock = testSessionMetaServiceLayer({
        messageCount: 0,
        firstUserMessage: null,
      });
      const PredictSessionsDatabaseMock = testPredictSessionsDatabaseLayer(
        new Map(),
      );

      const program = Effect.gen(function* () {
        const repo = yield* SessionRepository;
        return yield* repo.getSessions(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(PredictSessionsDatabaseMock),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessions).toEqual([]);
    });

    it("returns including predicted sessions", async () => {
      const projectPath = "/test/project";
      const projectId = Buffer.from(projectPath).toString("base64url");
      const mockDate = new Date("2024-01-01T00:00:00.000Z");
      const virtualDate = new Date("2024-01-03T00:00:00.000Z");

      const mockMeta: SessionMeta = {
        messageCount: 1,
        firstUserMessage: null,
      };

      const mockConversations: (Conversation | ErrorJsonl)[] = [
        {
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: virtualDate.toISOString(),
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "predict-session",
          version: "1.0.0",
          parentUuid: null,
        },
      ];

      const FileSystemMock = testFileSystemLayer({
        exists: (path: string) => Effect.succeed(path === projectPath),
        readDirectory: (path: string) =>
          path === projectPath
            ? Effect.succeed(["session1.jsonl"])
            : Effect.succeed([]),
        stat: () =>
          Effect.succeed(createFileInfo({ mtime: Option.some(mockDate) })),
      });

      const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);
      const PredictSessionsDatabaseMock = Layer.succeed(
        VirtualConversationDatabase,
        {
          getProjectVirtualConversations: (pid: string) =>
            Effect.succeed(
              pid === projectId
                ? [
                    {
                      projectId,
                      sessionId: "predict-session",
                      conversations: mockConversations,
                    },
                  ]
                : [],
            ),
          getSessionVirtualConversation: () => Effect.succeed(null),
          createVirtualConversation: () => Effect.void,
          deleteVirtualConversations: () => Effect.void,
        },
      );

      const program = Effect.gen(function* () {
        const repo = yield* SessionRepository;
        return yield* repo.getSessions(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(PredictSessionsDatabaseMock),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessions.length).toBeGreaterThanOrEqual(2);
      expect(result.sessions.some((s) => s.id === "predict-session")).toBe(
        true,
      );
    });
  });
});
