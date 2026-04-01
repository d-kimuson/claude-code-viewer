import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { Effect, Layer, Option } from "effect";
import {
  createFileInfo,
  testFileSystemLayer,
} from "../../../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import { testProjectMetaServiceLayer } from "../../../../testing/layers/testProjectMetaServiceLayer";
import { DrizzleService } from "../../../lib/db/DrizzleService";
import * as schema from "../../../lib/db/schema";
import { projects } from "../../../lib/db/schema";
import type { ProjectMeta } from "../../types";
import { ProjectRepository } from "./ProjectRepository";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const migrationsFolder = new URL("../../../lib/db/migrations", import.meta.url)
  .pathname;

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
  dirMtimeMs: new Date("2024-01-01T00:00:00.000Z").getTime(),
  syncedAt: Date.now(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProjectRepository", () => {
  describe("getProject", () => {
    it("returns project information when project exists", async () => {
      const projectPath = "/test/project";
      const projectId = Buffer.from(projectPath).toString("base64url");
      const mockDate = new Date("2024-01-01T00:00:00.000Z");
      const mockMeta: ProjectMeta = {
        projectName: "Test Project",
        projectPath: "/workspace",
        sessionCount: 5,
      };

      const FileSystemMock = testFileSystemLayer({
        exists: (path: string) => Effect.succeed(path === projectPath),
        stat: () =>
          Effect.succeed(
            createFileInfo({ type: "Directory", mtime: Option.some(mockDate) }),
          ),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProject(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(
            testProjectMetaServiceLayer({
              meta: mockMeta,
            }),
          ),
          Effect.provide(makeDrizzleServiceWithData({ projectRows: [] })),
          Effect.provide(FileSystemMock),
          Effect.provide(
            testPlatformLayer({
              claudeCodePaths: { claudeProjectsDirPath: "/test" },
            }),
          ),
        ),
      );

      expect(result.project).toEqual({
        id: projectId,
        claudeProjectPath: projectPath,
        lastModifiedAt: mockDate,
        meta: mockMeta,
      });
    });

    it("returns error when project does not exist", async () => {
      const projectPath = "/test/nonexistent";
      const projectId = Buffer.from(projectPath).toString("base64url");
      const mockMeta: ProjectMeta = {
        projectName: null,
        projectPath: null,
        sessionCount: 0,
      };

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(false),
        stat: () =>
          Effect.succeed(
            createFileInfo({
              type: "Directory",
              mtime: Option.some(new Date()),
            }),
          ),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProject(projectId);
      });

      await expect(
        Effect.runPromise(
          program.pipe(
            Effect.provide(ProjectRepository.Live),
            Effect.provide(
              testProjectMetaServiceLayer({
                meta: mockMeta,
              }),
            ),
            Effect.provide(makeDrizzleServiceWithData({ projectRows: [] })),
            Effect.provide(FileSystemMock),
            Effect.provide(
              testPlatformLayer({
                claudeCodePaths: { claudeProjectsDirPath: "/test" },
              }),
            ),
          ),
        ),
      ).rejects.toThrow("Project not found");
    });
  });

  describe("getProjects", () => {
    it("returns empty array when no projects in DB", async () => {
      const mockMeta: ProjectMeta = {
        projectName: null,
        projectPath: null,
        sessionCount: 0,
      };

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(
            testProjectMetaServiceLayer({
              meta: mockMeta,
            }),
          ),
          Effect.provide(makeDrizzleServiceWithData({ projectRows: [] })),
          Effect.provide(testFileSystemLayer({})),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.projects).toEqual([]);
    });

    it("returns multiple projects from DB ordered by dir_mtime_ms DESC", async () => {
      const date1 = new Date("2024-01-01T00:00:00.000Z");
      const date2 = new Date("2024-01-02T00:00:00.000Z");
      const date3 = new Date("2024-01-03T00:00:00.000Z");

      const projectId1 = Buffer.from("/test/project1").toString("base64url");
      const projectId2 = Buffer.from("/test/project2").toString("base64url");
      const projectId3 = Buffer.from("/test/project3").toString("base64url");

      // DB returns rows ordered by dir_mtime_ms DESC (newest first)
      const projectRows = [
        makeProjectRow({
          id: projectId3,
          path: "/test/project3",
          dirMtimeMs: date3.getTime(),
        }),
        makeProjectRow({
          id: projectId2,
          path: "/test/project2",
          dirMtimeMs: date2.getTime(),
        }),
        makeProjectRow({
          id: projectId1,
          path: "/test/project1",
          dirMtimeMs: date1.getTime(),
        }),
      ];

      const mockMeta: ProjectMeta = {
        projectName: "project",
        projectPath: "/test/project",
        sessionCount: 1,
      };

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(testProjectMetaServiceLayer({ meta: mockMeta })),
          Effect.provide(makeDrizzleServiceWithData({ projectRows })),
          Effect.provide(testFileSystemLayer({})),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.projects.length).toBe(3);
      // Projects should be in the order returned by DB (newest first)
      expect(result.projects.at(0)?.lastModifiedAt).toEqual(date3);
      expect(result.projects.at(1)?.lastModifiedAt).toEqual(date2);
      expect(result.projects.at(2)?.lastModifiedAt).toEqual(date1);
    });

    it("uses row.path for claudeProjectPath when available", async () => {
      const projectId = Buffer.from("/test/project").toString("base64url");

      const projectRows = [
        makeProjectRow({ id: projectId, path: "/test/project" }),
      ];

      const mockMeta: ProjectMeta = {
        projectName: "project",
        projectPath: "/test/project",
        sessionCount: 0,
      };

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(testProjectMetaServiceLayer({ meta: mockMeta })),
          Effect.provide(makeDrizzleServiceWithData({ projectRows })),
          Effect.provide(testFileSystemLayer({})),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.projects.at(0)?.claudeProjectPath).toBe("/test/project");
    });

    it("falls back to decodeProjectId when path is null", async () => {
      const projectPath = "/test/project";
      const projectId = Buffer.from(projectPath).toString("base64url");

      const projectRows = [makeProjectRow({ id: projectId, path: null })];

      const mockMeta: ProjectMeta = {
        projectName: null,
        projectPath: null,
        sessionCount: 0,
      };

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(testProjectMetaServiceLayer({ meta: mockMeta })),
          Effect.provide(makeDrizzleServiceWithData({ projectRows })),
          Effect.provide(testFileSystemLayer({})),
          Effect.provide(testPlatformLayer()),
        ),
      );

      // Falls back to decoding project ID
      expect(result.projects.at(0)?.claudeProjectPath).toBe(projectPath);
    });
  });
});
