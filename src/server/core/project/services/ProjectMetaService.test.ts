import { DatabaseSync } from "node:sqlite";
import { Path } from "@effect/platform";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { Effect, Layer } from "effect";
import { DrizzleService } from "../../../lib/db/DrizzleService";
import * as schema from "../../../lib/db/schema";
import { projects } from "../../../lib/db/schema";
import { type ISyncService, SyncService } from "../../sync/services/SyncService";
import { ProjectMetaService } from "../services/ProjectMetaService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const migrationsFolder = new URL("../../../lib/db/migrations", import.meta.url).pathname;

const makeSyncServiceMock = (overrides?: Partial<ISyncService>): Layer.Layer<SyncService> =>
  Layer.succeed(SyncService, {
    fullSync: () => Effect.void,
    syncSession: () => Effect.void,
    syncProjectList: () => Effect.void,
    ...overrides,
  });

const createInMemoryDb = () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const db = drizzle({ client: sqlite, schema });
  migrate(db, { migrationsFolder });
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS session_messages_fts USING fts5(
      session_id UNINDEXED,
      project_id UNINDEXED,
      role UNINDEXED,
      content,
      conversation_index UNINDEXED,
      tokenize='trigram'
    )
  `);
  return { db, rawDb: sqlite };
};

const makeDrizzleServiceWithData = (opts: {
  projectRows?: (typeof projects.$inferInsert)[];
}): Layer.Layer<DrizzleService> => {
  const { db, rawDb } = createInMemoryDb();

  for (const row of opts.projectRows ?? []) {
    db.insert(projects).values(row).run();
  }

  return Layer.succeed(DrizzleService, { db, rawDb });
};

const makeProjectRow = (
  overrides?: Partial<typeof projects.$inferInsert>,
): typeof projects.$inferInsert => ({
  id: Buffer.from("/test/project").toString("base64url"),
  name: "project",
  path: "/test/project",
  sessionCount: 3,
  dirMtimeMs: Date.now(),
  syncedAt: Date.now(),
  ...overrides,
});

const projectId = Buffer.from("/test/project").toString("base64url");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProjectMetaService", () => {
  describe("getProjectMeta", () => {
    it("returns project metadata from DB row", async () => {
      const row = makeProjectRow({
        id: projectId,
        path: "/test/project",
        sessionCount: 5,
      });

      const program = Effect.gen(function* () {
        const service = yield* ProjectMetaService;
        return yield* service.getProjectMeta(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(makeDrizzleServiceWithData({ projectRows: [row] })),
          Effect.provide(makeSyncServiceMock()),
          Effect.provide(Path.layer),
        ),
      );

      expect(result.projectPath).toBe("/test/project");
      expect(result.projectName).toBe("project");
      expect(result.sessionCount).toBe(5);
    });

    it("returns null projectName and projectPath when path column is null", async () => {
      const row = makeProjectRow({
        id: projectId,
        path: null,
        sessionCount: 2,
      });

      const program = Effect.gen(function* () {
        const service = yield* ProjectMetaService;
        return yield* service.getProjectMeta(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(makeDrizzleServiceWithData({ projectRows: [row] })),
          Effect.provide(makeSyncServiceMock()),
          Effect.provide(Path.layer),
        ),
      );

      expect(result.projectPath).toBeNull();
      expect(result.projectName).toBeNull();
      expect(result.sessionCount).toBe(2);
    });

    it("triggers syncProjectList and retries when project not in DB", async () => {
      let syncCalled = false;
      const row = makeProjectRow({ id: projectId });
      const { db, rawDb } = createInMemoryDb();

      // DB starts empty — no project rows
      const program = Effect.gen(function* () {
        const service = yield* ProjectMetaService;
        return yield* service.getProjectMeta(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(Layer.succeed(DrizzleService, { db, rawDb })),
          Effect.provide(
            makeSyncServiceMock({
              syncProjectList: () =>
                Effect.sync(() => {
                  syncCalled = true;
                  // Insert the project row so retry finds it
                  db.insert(projects).values(row).run();
                }),
            }),
          ),
          Effect.provide(Path.layer),
        ),
      );

      expect(syncCalled).toBe(true);
      expect(result.projectPath).toBe("/test/project");
    });

    it("fails when project not found even after sync", async () => {
      const { db, rawDb } = createInMemoryDb();

      const program = Effect.gen(function* () {
        const service = yield* ProjectMetaService;
        return yield* service.getProjectMeta("nonexistent-project-id");
      });

      await expect(
        Effect.runPromise(
          program.pipe(
            Effect.provide(ProjectMetaService.Live),
            Effect.provide(Layer.succeed(DrizzleService, { db, rawDb })),
            Effect.provide(makeSyncServiceMock()),
            Effect.provide(Path.layer),
          ),
        ),
      ).rejects.toThrow("Project not found: nonexistent-project-id");
    });
  });

  describe("invalidateProject", () => {
    it("calls syncProjectList on invalidate", async () => {
      let syncCalled = false;
      const row = makeProjectRow({ id: projectId });

      const program = Effect.gen(function* () {
        const service = yield* ProjectMetaService;
        yield* service.invalidateProject(projectId);
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(makeDrizzleServiceWithData({ projectRows: [row] })),
          Effect.provide(
            makeSyncServiceMock({
              syncProjectList: () =>
                Effect.sync(() => {
                  syncCalled = true;
                }),
            }),
          ),
          Effect.provide(Path.layer),
        ),
      );

      expect(syncCalled).toBe(true);
    });

    it("does not throw even if syncProjectList fails", async () => {
      const row = makeProjectRow({ id: projectId });

      const program = Effect.gen(function* () {
        const service = yield* ProjectMetaService;
        yield* service.invalidateProject(projectId);
      });

      await expect(
        Effect.runPromise(
          program.pipe(
            Effect.provide(ProjectMetaService.Live),
            Effect.provide(makeDrizzleServiceWithData({ projectRows: [row] })),
            Effect.provide(
              makeSyncServiceMock({
                syncProjectList: () => Effect.fail(new Error("sync failed")),
              }),
            ),
            Effect.provide(Path.layer),
          ),
        ),
      ).resolves.toBeUndefined();
    });
  });
});
