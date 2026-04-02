import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import {
  createInMemoryDrizzle,
  makeDrizzleTestServiceLayer,
} from "../../../../testing/layers/testDrizzleServiceLayer.ts";
import { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import { projects, sessions } from "../../../lib/db/schema.ts";
import { type ISyncService, SyncService } from "../../sync/services/SyncService.ts";
import { SessionMetaService } from "../services/SessionMetaService.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSyncServiceMock = (overrides?: Partial<ISyncService>): Layer.Layer<SyncService> =>
  Layer.succeed(SyncService, {
    fullSync: () => Effect.void,
    syncSession: () => Effect.void,
    syncProjectList: () => Effect.void,
    ...overrides,
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

const defaultProjectRow: typeof projects.$inferInsert = {
  id: "test-project-id",
  name: "test-project",
  path: "/test/project",
  sessionCount: 0,
  dirMtimeMs: Date.now(),
  syncedAt: Date.now(),
};

const makeSessionRow = (
  overrides?: Partial<typeof sessions.$inferInsert>,
): typeof sessions.$inferInsert => ({
  id: "test-session-id",
  projectId: "test-project-id",
  filePath: "/test/project/test-session-id.jsonl",
  messageCount: 5,
  firstUserMessageJson: JSON.stringify({ kind: "text", content: "hello" }),
  customTitle: null,
  totalCostUsd: 0.01,
  costBreakdownJson: JSON.stringify({
    inputTokensUsd: 0.003,
    outputTokensUsd: 0.007,
    cacheCreationUsd: 0,
    cacheReadUsd: 0,
  }),
  tokenUsageJson: JSON.stringify({
    inputTokens: 1000,
    outputTokens: 500,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  }),
  modelName: "claude-3-5-sonnet-20240620",
  prLinksJson: null,
  fileMtimeMs: Date.now(),
  lastModifiedAt: new Date().toISOString(),
  syncedAt: Date.now(),
  ...overrides,
});

const projectId = Buffer.from("/test/project").toString("base64url");
const sessionId = "test-session-id";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SessionMetaService", () => {
  describe("getSessionMeta", () => {
    it.live("returns session metadata from DB row", () =>
      Effect.gen(function* () {
        const service = yield* SessionMetaService;
        const result = yield* service.getSessionMeta(projectId, sessionId);

        expect(result.messageCount).toBe(5);
        expect(result.firstUserMessage).toEqual({
          kind: "text",
          content: "hello",
        });
        expect(result.cost.totalUsd).toBeCloseTo(0.01);
        expect(result.cost.tokenUsage.inputTokens).toBe(1000);
        expect(result.cost.tokenUsage.outputTokens).toBe(500);
        expect(result.modelName).toBe("claude-3-5-sonnet-20240620");
        expect(result.prLinks).toEqual([]);
        expect(result.customTitle).toBeNull();
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(
          makeDrizzleServiceWithData({
            projectRows: [defaultProjectRow],
            sessionRows: [makeSessionRow({ id: sessionId })],
          }),
        ),
        Effect.provide(makeSyncServiceMock()),
      ),
    );

    it.live("returns null firstUserMessage when column is null", () =>
      Effect.gen(function* () {
        const service = yield* SessionMetaService;
        const result = yield* service.getSessionMeta(projectId, sessionId);

        expect(result.firstUserMessage).toBeNull();
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(
          makeDrizzleServiceWithData({
            projectRows: [defaultProjectRow],
            sessionRows: [
              makeSessionRow({
                id: sessionId,
                firstUserMessageJson: null,
              }),
            ],
          }),
        ),
        Effect.provide(makeSyncServiceMock()),
      ),
    );

    it.live("parses customTitle from DB row", () =>
      Effect.gen(function* () {
        const service = yield* SessionMetaService;
        const result = yield* service.getSessionMeta(projectId, sessionId);

        expect(result.customTitle).toBe("My Custom Title");
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(
          makeDrizzleServiceWithData({
            projectRows: [defaultProjectRow],
            sessionRows: [
              makeSessionRow({
                id: sessionId,
                customTitle: "My Custom Title",
              }),
            ],
          }),
        ),
        Effect.provide(makeSyncServiceMock()),
      ),
    );

    it.live("parses prLinks from DB row", () =>
      Effect.gen(function* () {
        const prLinks = [
          {
            prNumber: 42,
            prUrl: "https://github.com/test/repo/pull/42",
            prRepository: "test/repo",
          },
        ];

        const service = yield* SessionMetaService;
        const result = yield* service.getSessionMeta(projectId, sessionId);

        expect(result.prLinks).toEqual(prLinks);
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(
          makeDrizzleServiceWithData({
            projectRows: [defaultProjectRow],
            sessionRows: [
              makeSessionRow({
                id: sessionId,
                prLinksJson: JSON.stringify([
                  {
                    prNumber: 42,
                    prUrl: "https://github.com/test/repo/pull/42",
                    prRepository: "test/repo",
                  },
                ]),
              }),
            ],
          }),
        ),
        Effect.provide(makeSyncServiceMock()),
      ),
    );

    it.live("returns empty prLinks when pr_links_json is null", () =>
      Effect.gen(function* () {
        const service = yield* SessionMetaService;
        const result = yield* service.getSessionMeta(projectId, sessionId);

        expect(result.prLinks).toEqual([]);
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(
          makeDrizzleServiceWithData({
            projectRows: [defaultProjectRow],
            sessionRows: [makeSessionRow({ id: sessionId, prLinksJson: null })],
          }),
        ),
        Effect.provide(makeSyncServiceMock()),
      ),
    );

    it.live("triggers syncSession and retries when session not in DB", () => {
      let syncCalled = false;
      const { db, rawDb } = createInMemoryDrizzle();

      // Insert project row (required for foreign key)
      db.insert(projects).values(defaultProjectRow).run();

      // DB starts empty — no session rows
      return Effect.gen(function* () {
        const service = yield* SessionMetaService;
        const result = yield* service.getSessionMeta(projectId, sessionId);

        expect(syncCalled).toBe(true);
        expect(result.messageCount).toBe(5);
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(Layer.succeed(DrizzleService, { db, rawDb })),
        Effect.provide(
          makeSyncServiceMock({
            syncSession: () =>
              Effect.sync(() => {
                syncCalled = true;
                // Insert the session row so retry finds it
                db.insert(sessions)
                  .values(makeSessionRow({ id: sessionId }))
                  .run();
              }),
          }),
        ),
      );
    });

    it.live("fails when session not found even after sync", () => {
      const { db, rawDb } = createInMemoryDrizzle();

      return Effect.gen(function* () {
        const service = yield* SessionMetaService;
        const result = yield* service
          .getSessionMeta(projectId, "nonexistent-session")
          .pipe(Effect.flip);

        expect(String(result)).toContain("Session not found: nonexistent-session");
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(Layer.succeed(DrizzleService, { db, rawDb })),
        Effect.provide(makeSyncServiceMock()),
      );
    });
  });

  describe("invalidateSession", () => {
    it.live("calls syncSession on invalidate", () => {
      let syncCalled = false;
      const row = makeSessionRow({ id: sessionId });

      return Effect.gen(function* () {
        const service = yield* SessionMetaService;
        yield* service.invalidateSession(projectId, sessionId);

        expect(syncCalled).toBe(true);
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(
          makeDrizzleServiceWithData({
            projectRows: [defaultProjectRow],
            sessionRows: [row],
          }),
        ),
        Effect.provide(
          makeSyncServiceMock({
            syncSession: () =>
              Effect.sync(() => {
                syncCalled = true;
              }),
          }),
        ),
      );
    });

    it.live("does not throw even if syncSession fails", () =>
      Effect.gen(function* () {
        const service = yield* SessionMetaService;
        const result = yield* service.invalidateSession(projectId, sessionId);

        expect(result).toBeUndefined();
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(
          makeDrizzleServiceWithData({
            projectRows: [defaultProjectRow],
            sessionRows: [makeSessionRow({ id: sessionId })],
          }),
        ),
        Effect.provide(
          makeSyncServiceMock({
            syncSession: () => Effect.fail(new Error("sync failed")),
          }),
        ),
      ),
    );
  });

  describe("cost calculation", () => {
    it.live("returns zero cost when breakdown columns are null", () =>
      Effect.gen(function* () {
        const service = yield* SessionMetaService;
        const result = yield* service.getSessionMeta(projectId, sessionId);

        expect(result.cost.totalUsd).toBe(0);
        expect(result.cost.tokenUsage.inputTokens).toBe(0);
        expect(result.cost.tokenUsage.outputTokens).toBe(0);
        expect(result.cost.breakdown.inputTokensUsd).toBe(0);
      }).pipe(
        Effect.provide(SessionMetaService.Live),
        Effect.provide(
          makeDrizzleServiceWithData({
            projectRows: [defaultProjectRow],
            sessionRows: [
              makeSessionRow({
                id: sessionId,
                totalCostUsd: 0,
                costBreakdownJson: null,
                tokenUsageJson: null,
              }),
            ],
          }),
        ),
        Effect.provide(makeSyncServiceMock()),
      ),
    );
  });
});
