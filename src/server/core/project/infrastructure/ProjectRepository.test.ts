import { it } from "@effect/vitest";
import { Effect, Option, type Layer } from "effect";
import { describe, expect } from "vitest";
import { makeDrizzleTestServiceLayer } from "../../../../testing/layers/testDrizzleServiceLayer.ts";
import {
  createFileInfo,
  testFileSystemLayer,
} from "../../../../testing/layers/testFileSystemLayer.ts";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import { testProjectMetaServiceLayer } from "../../../../testing/layers/testProjectMetaServiceLayer.ts";
import type { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import { projects } from "../../../lib/db/schema.ts";
import type { ProjectMeta } from "../../types.ts";
import { ProjectRepository } from "./ProjectRepository.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeDrizzleServiceWithData = (opts: {
  projectRows?: (typeof projects.$inferInsert)[];
}): Layer.Layer<DrizzleService> => {
  return makeDrizzleTestServiceLayer((db) => {
    for (const row of opts.projectRows ?? []) {
      db.insert(projects).values(row).run();
    }
  });
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
    it.live("returns project information when project exists", () => {
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
          Effect.succeed(createFileInfo({ type: "Directory", mtime: Option.some(mockDate) })),
      });

      return Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        const result = yield* repo.getProject(projectId);

        expect(result.project).toEqual({
          id: projectId,
          claudeProjectPath: projectPath,
          lastModifiedAt: mockDate,
          meta: mockMeta,
        });
      }).pipe(
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
      );
    });

    it.live("returns error when project does not exist", () => {
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

      return Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        const error = yield* repo.getProject(projectId).pipe(Effect.flip);

        expect(String(error)).toContain("Project not found");
      }).pipe(
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
      );
    });
  });

  describe("getProjects", () => {
    it.live("returns empty array when no projects in DB", () => {
      const mockMeta: ProjectMeta = {
        projectName: null,
        projectPath: null,
        sessionCount: 0,
      };

      return Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        const result = yield* repo.getProjects();

        expect(result.projects).toEqual([]);
      }).pipe(
        Effect.provide(ProjectRepository.Live),
        Effect.provide(
          testProjectMetaServiceLayer({
            meta: mockMeta,
          }),
        ),
        Effect.provide(makeDrizzleServiceWithData({ projectRows: [] })),
        Effect.provide(testFileSystemLayer({})),
        Effect.provide(testPlatformLayer()),
      );
    });

    it.live("returns multiple projects from DB ordered by dir_mtime_ms DESC", () => {
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

      return Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        const result = yield* repo.getProjects();

        expect(result.projects.length).toBe(3);
        // Projects should be in the order returned by DB (newest first)
        expect(result.projects.at(0)?.lastModifiedAt).toEqual(date3);
        expect(result.projects.at(1)?.lastModifiedAt).toEqual(date2);
        expect(result.projects.at(2)?.lastModifiedAt).toEqual(date1);
      }).pipe(
        Effect.provide(ProjectRepository.Live),
        Effect.provide(testProjectMetaServiceLayer({ meta: mockMeta })),
        Effect.provide(makeDrizzleServiceWithData({ projectRows })),
        Effect.provide(testFileSystemLayer({})),
        Effect.provide(testPlatformLayer()),
      );
    });

    it.live("uses row.path for claudeProjectPath when available", () => {
      const projectId = Buffer.from("/test/project").toString("base64url");

      const projectRows = [makeProjectRow({ id: projectId, path: "/test/project" })];

      const mockMeta: ProjectMeta = {
        projectName: "project",
        projectPath: "/test/project",
        sessionCount: 0,
      };

      return Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        const result = yield* repo.getProjects();

        expect(result.projects.at(0)?.claudeProjectPath).toBe("/test/project");
      }).pipe(
        Effect.provide(ProjectRepository.Live),
        Effect.provide(testProjectMetaServiceLayer({ meta: mockMeta })),
        Effect.provide(makeDrizzleServiceWithData({ projectRows })),
        Effect.provide(testFileSystemLayer({})),
        Effect.provide(testPlatformLayer()),
      );
    });

    it.live("falls back to decodeProjectId when path is null", () => {
      const projectPath = "/test/project";
      const projectId = Buffer.from(projectPath).toString("base64url");

      const projectRows = [makeProjectRow({ id: projectId, path: null })];

      const mockMeta: ProjectMeta = {
        projectName: null,
        projectPath: null,
        sessionCount: 0,
      };

      return Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        const result = yield* repo.getProjects();

        // Falls back to decoding project ID
        expect(result.projects.at(0)?.claudeProjectPath).toBe(projectPath);
      }).pipe(
        Effect.provide(ProjectRepository.Live),
        Effect.provide(testProjectMetaServiceLayer({ meta: mockMeta })),
        Effect.provide(makeDrizzleServiceWithData({ projectRows })),
        Effect.provide(testFileSystemLayer({})),
        Effect.provide(testPlatformLayer()),
      );
    });
  });
});
