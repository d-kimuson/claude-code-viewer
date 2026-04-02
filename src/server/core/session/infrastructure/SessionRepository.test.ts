import { SystemError } from "@effect/platform/Error";
import { it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { expect } from "vitest";
import {
  createInMemoryDrizzle,
  makeDrizzleTestServiceLayer,
} from "../../../../testing/layers/testDrizzleServiceLayer.ts";
import {
  createFileInfo,
  testFileSystemLayer,
} from "../../../../testing/layers/testFileSystemLayer.ts";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import { projects, sessions } from "../../../lib/db/schema.ts";
import { type ISyncService, SyncService } from "../../sync/services/SyncService.ts";
import type { SessionMeta } from "../../types.ts";
import { SessionRepository } from "../infrastructure/SessionRepository.ts";
import { SessionMetaService } from "../services/SessionMetaService.ts";
import { createMockSessionMeta } from "../testing/createMockSessionMeta.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testSessionMetaServiceLayer = (meta: SessionMeta) =>
  Layer.mock(SessionMetaService, {
    getSessionMeta: () => Effect.succeed(meta),
    invalidateSession: () => Effect.void,
  });

const makeSyncServiceMock = (overrides?: Partial<ISyncService>): Layer.Layer<SyncService> =>
  Layer.succeed(SyncService, {
    fullSync: () => Effect.void,
    syncSession: () => Effect.void,
    syncProjectList: () => Effect.void,
    ...overrides,
  });

const defaultProjectRow: typeof projects.$inferInsert = {
  id: Buffer.from("/test/project").toString("base64url"),
  name: "project",
  path: "/test/project",
  sessionCount: 0,
  dirMtimeMs: Date.now(),
  syncedAt: Date.now(),
};

const makeSessionRow = (
  id: string,
  projectId: string,
  lastModifiedAt: Date,
): typeof sessions.$inferInsert => ({
  id,
  projectId,
  filePath: `/test/project/${id}.jsonl`,
  messageCount: 1,
  firstUserMessageJson: null,
  customTitle: null,
  totalCostUsd: 0,
  costBreakdownJson: null,
  tokenUsageJson: null,
  modelName: null,
  prLinksJson: null,
  fileMtimeMs: lastModifiedAt.getTime(),
  lastModifiedAt: lastModifiedAt.toISOString(),
  syncedAt: Date.now(),
});

const makeDrizzleServiceWithData = (opts: {
  projectRows?: (typeof projects.$inferInsert)[];
  sessionRows?: (typeof sessions.$inferInsert)[];
}): Layer.Layer<DrizzleService> => {
  return makeDrizzleTestServiceLayer((db) => {
    for (const row of opts.projectRows ?? []) {
      db.insert(projects).values(row).run();
    }
    for (const row of opts.sessionRows ?? []) {
      db.insert(sessions).values(row).run();
    }
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SessionRepository", () => {
  describe("getSession", () => {
    it.live("returns session details when session file exists", () =>
      Effect.gen(function* () {
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = "test-session";
        const sessionPath = `/test/project/${sessionId}.jsonl`;
        const mockDate = new Date("2024-01-01T00:00:00.000Z");
        const mockMeta: SessionMeta = createMockSessionMeta({
          messageCount: 3,
          firstUserMessage: null,
        });

        const mockContent = `{"type":"user","message":{"role":"user","content":"Hello"}}\n{"type":"assistant","message":{"role":"assistant","content":"Hi"}}\n{"type":"user","message":{"role":"user","content":"Test"}}`;

        const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);

        const result = yield* Effect.gen(function* () {
          const repo = yield* SessionRepository;
          return yield* repo.getSession(projectId, sessionId);
        }).pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(
            makeDrizzleServiceWithData({
              projectRows: [defaultProjectRow],
            }),
          ),
          Effect.provide(makeSyncServiceMock()),
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
          Effect.provide(
            testPlatformLayer({
              claudeCodePaths: { claudeProjectsDirPath: "/test" },
            }),
          ),
        );

        expect(result.session).not.toBeNull();
        if (result.session === null) {
          throw new Error("Expected session to exist");
        }
        expect(result.session.id).toBe(sessionId);
        expect(result.session.jsonlFilePath).toBe(sessionPath);
        expect(result.session.meta).toEqual(mockMeta);
        expect(result.session.conversations).toHaveLength(3);
        expect(result.session.lastModifiedAt).toEqual(mockDate);
      }),
    );

    it.live("returns null when session does not exist", () =>
      Effect.gen(function* () {
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = "nonexistent-session";

        const FileSystemMock = testFileSystemLayer({
          exists: () => Effect.succeed(false),
        });

        const SessionMetaServiceMock = testSessionMetaServiceLayer(
          createMockSessionMeta({
            messageCount: 0,
            firstUserMessage: null,
          }),
        );

        const result = yield* Effect.gen(function* () {
          const repo = yield* SessionRepository;
          return yield* repo.getSession(projectId, sessionId);
        }).pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(
            makeDrizzleServiceWithData({
              projectRows: [defaultProjectRow],
            }),
          ),
          Effect.provide(makeSyncServiceMock()),
          Effect.provide(FileSystemMock),
          Effect.provide(
            testPlatformLayer({
              claudeCodePaths: { claudeProjectsDirPath: "/test" },
            }),
          ),
        );

        expect(result.session).toBeNull();
      }),
    );
  });

  describe("getSessions", () => {
    it.live("returns list of sessions within project ordered by last_modified_at DESC", () =>
      Effect.gen(function* () {
        const projectPath = "/test/project";
        const projectId = Buffer.from(projectPath).toString("base64url");
        const date1 = new Date("2024-01-01T00:00:00.000Z");
        const date2 = new Date("2024-01-02T00:00:00.000Z");

        const mockMeta: SessionMeta = createMockSessionMeta({
          messageCount: 1,
          firstUserMessage: null,
        });

        // DB rows ordered by last_modified_at DESC (newer first)
        const sessionRows = [
          makeSessionRow("session1", projectId, date2), // newer
          makeSessionRow("session2", projectId, date1), // older
        ];

        const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);

        const result = yield* Effect.gen(function* () {
          const repo = yield* SessionRepository;
          return yield* repo.getSessions(projectId);
        }).pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(
            makeDrizzleServiceWithData({
              projectRows: [defaultProjectRow],
              sessionRows,
            }),
          ),
          Effect.provide(makeSyncServiceMock()),
          Effect.provide(testFileSystemLayer({})),
          Effect.provide(
            testPlatformLayer({
              claudeCodePaths: { claudeProjectsDirPath: "/test" },
            }),
          ),
        );

        expect(result.sessions).toHaveLength(2);
        expect(result.sessions.at(0)?.id).toBe("session1");
        expect(result.sessions.at(1)?.id).toBe("session2");
      }),
    );

    it.live("can limit number of results with maxCount option", () =>
      Effect.gen(function* () {
        const projectPath = "/test/project";
        const projectId = Buffer.from(projectPath).toString("base64url");
        const mockDate = new Date("2024-01-01T00:00:00.000Z");

        const mockMeta: SessionMeta = createMockSessionMeta({
          messageCount: 1,
          firstUserMessage: null,
        });

        const sessionRows = [
          makeSessionRow("session1", projectId, mockDate),
          makeSessionRow("session2", projectId, mockDate),
          makeSessionRow("session3", projectId, mockDate),
        ];

        const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);

        const result = yield* Effect.gen(function* () {
          const repo = yield* SessionRepository;
          return yield* repo.getSessions(projectId, { maxCount: 2 });
        }).pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(
            makeDrizzleServiceWithData({
              projectRows: [defaultProjectRow],
              sessionRows,
            }),
          ),
          Effect.provide(makeSyncServiceMock()),
          Effect.provide(testFileSystemLayer({})),
          Effect.provide(
            testPlatformLayer({
              claudeCodePaths: { claudeProjectsDirPath: "/test" },
            }),
          ),
        );

        expect(result.sessions).toHaveLength(2);
      }),
    );

    it.live("can paginate with cursor option", () =>
      Effect.gen(function* () {
        const projectPath = "/test/project";
        const projectId = Buffer.from(projectPath).toString("base64url");
        const mockDate = new Date("2024-01-01T00:00:00.000Z");

        const mockMeta: SessionMeta = createMockSessionMeta({
          messageCount: 1,
          firstUserMessage: null,
        });

        // 3 sessions, cursor=session1 should return session2 and session3
        const sessionRows = [
          makeSessionRow("session1", projectId, mockDate),
          makeSessionRow("session2", projectId, mockDate),
          makeSessionRow("session3", projectId, mockDate),
        ];

        const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);

        const result = yield* Effect.gen(function* () {
          const repo = yield* SessionRepository;
          return yield* repo.getSessions(projectId, {
            cursor: "session1",
          });
        }).pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(
            makeDrizzleServiceWithData({
              projectRows: [defaultProjectRow],
              sessionRows,
            }),
          ),
          Effect.provide(makeSyncServiceMock()),
          Effect.provide(testFileSystemLayer({})),
          Effect.provide(
            testPlatformLayer({
              claudeCodePaths: { claudeProjectsDirPath: "/test" },
            }),
          ),
        );

        expect(result.sessions.length).toBeGreaterThan(0);
        expect(result.sessions.every((s) => s.id !== "session1")).toBe(true);
      }),
    );

    it.live("returns empty array when project has no sessions in DB", () =>
      Effect.gen(function* () {
        const projectId = Buffer.from("/test/nonexistent").toString("base64url");

        const SessionMetaServiceMock = testSessionMetaServiceLayer(
          createMockSessionMeta({
            messageCount: 0,
            firstUserMessage: null,
          }),
        );

        const result = yield* Effect.gen(function* () {
          const repo = yield* SessionRepository;
          return yield* repo.getSessions(projectId);
        }).pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(
            makeDrizzleServiceWithData({
              projectRows: [defaultProjectRow],
            }),
          ),
          Effect.provide(makeSyncServiceMock()),
          Effect.provide(testFileSystemLayer({})),
          Effect.provide(
            testPlatformLayer({
              claudeCodePaths: { claudeProjectsDirPath: "/test" },
            }),
          ),
        );

        expect(result.sessions).toEqual([]);
      }),
    );

    it.live("triggers syncProjectList when project not in DB", () =>
      Effect.gen(function* () {
        const projectPath = "/test/project";
        const projectId = Buffer.from(projectPath).toString("base64url");
        let syncCalled = false;

        const mockMeta: SessionMeta = createMockSessionMeta({
          messageCount: 1,
          firstUserMessage: null,
        });

        const SessionMetaServiceMock = testSessionMetaServiceLayer(mockMeta);

        // Start with an empty DB — no project row
        const { db, rawDb } = createInMemoryDrizzle();

        yield* Effect.gen(function* () {
          const repo = yield* SessionRepository;
          return yield* repo.getSessions(projectId);
        }).pipe(
          Effect.provide(SessionRepository.Live),
          Effect.provide(SessionMetaServiceMock),
          Effect.provide(Layer.succeed(DrizzleService, { db, rawDb })),
          Effect.provide(
            makeSyncServiceMock({
              syncProjectList: () =>
                Effect.sync(() => {
                  syncCalled = true;
                }),
            }),
          ),
          Effect.provide(testFileSystemLayer({})),
          Effect.provide(
            testPlatformLayer({
              claudeCodePaths: { claudeProjectsDirPath: "/test" },
            }),
          ),
        );

        expect(syncCalled).toBe(true);
      }),
    );
  });
});
