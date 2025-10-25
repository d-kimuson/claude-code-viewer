import { SystemError } from "@effect/platform/Error";
import { Effect, Option } from "effect";
import {
  createFileInfo,
  testFileSystemLayer,
} from "../../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../../testing/layers/testPlatformLayer";
import { testProjectMetaServiceLayer } from "../../../testing/layers/testProjectMetaServiceLayer";
import type { ProjectMeta } from "../../types";
import { ProjectMetaService } from "../services/ProjectMetaService";
import { ProjectRepository } from "./ProjectRepository";

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
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
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
            Effect.provide(FileSystemMock),
            Effect.provide(testPlatformLayer()),
          ),
        ),
      ).rejects.toThrow("Project not found");
    });
  });

  describe("getProjects", () => {
    it("returns empty array when project directory does not exist", async () => {
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
          Effect.provide(
            testFileSystemLayer({
              exists: () => Effect.succeed(false),
              readDirectory: () => Effect.succeed([]),
              stat: () =>
                Effect.succeed(
                  createFileInfo({
                    type: "Directory",
                    mtime: Option.some(new Date()),
                  }),
                ),
            }),
          ),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.projects).toEqual([]);
    });

    it("returns multiple projects correctly sorted", async () => {
      const date1 = new Date("2024-01-01T00:00:00.000Z");
      const date2 = new Date("2024-01-02T00:00:00.000Z");
      const date3 = new Date("2024-01-03T00:00:00.000Z");

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(
            testFileSystemLayer({
              exists: () => Effect.succeed(true),
              readDirectory: () =>
                Effect.succeed(["project1", "project2", "project3"]),
              readFileString: () =>
                Effect.succeed(
                  '{"type":"user","cwd":"/workspace","text":"test"}',
                ),
              stat: (path: string) => {
                if (path.includes("project1")) {
                  return Effect.succeed(
                    createFileInfo({
                      type: "Directory",
                      mtime: Option.some(date2),
                    }),
                  );
                }
                if (path.includes("project2")) {
                  return Effect.succeed(
                    createFileInfo({
                      type: "Directory",
                      mtime: Option.some(date3),
                    }),
                  );
                }
                if (path.includes("project3")) {
                  return Effect.succeed(
                    createFileInfo({
                      type: "Directory",
                      mtime: Option.some(date1),
                    }),
                  );
                }
                return Effect.succeed(
                  createFileInfo({
                    type: "Directory",
                    mtime: Option.some(new Date()),
                  }),
                );
              },
              makeDirectory: () => Effect.void,
              writeFileString: () => Effect.void,
            }),
          ),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.projects.length).toBe(3);
      expect(result.projects.at(0)?.lastModifiedAt).toEqual(date3); // project2
      expect(result.projects.at(1)?.lastModifiedAt).toEqual(date2); // project1
      expect(result.projects.at(2)?.lastModifiedAt).toEqual(date1); // project3
    });

    it("filters only directories", async () => {
      const date = new Date("2024-01-01T00:00:00.000Z");

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(
            testFileSystemLayer({
              exists: () => Effect.succeed(true),
              readDirectory: () =>
                Effect.succeed(["project1", "file.txt", "project2"]),
              readFileString: () =>
                Effect.succeed(
                  '{"type":"user","cwd":"/workspace","text":"test"}',
                ),
              stat: (path: string) => {
                if (path.includes("file.txt")) {
                  return Effect.succeed(
                    createFileInfo({ type: "File", mtime: Option.some(date) }),
                  );
                }
                return Effect.succeed(
                  createFileInfo({
                    type: "Directory",
                    mtime: Option.some(date),
                  }),
                );
              },
              makeDirectory: () => Effect.void,
              writeFileString: () => Effect.void,
            }),
          ),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.projects.length).toBe(2);
      expect(
        result.projects.every((p) => p.claudeProjectPath.match(/project[12]$/)),
      ).toBe(true);
    });

    it("skips entries where stat retrieval fails", async () => {
      const date = new Date("2024-01-01T00:00:00.000Z");

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(
            testFileSystemLayer({
              exists: () => Effect.succeed(true),
              readDirectory: () =>
                Effect.succeed(["project1", "broken", "project2"]),
              readFileString: () =>
                Effect.succeed(
                  '{"type":"user","cwd":"/workspace","text":"test"}',
                ),
              stat: (path: string) => {
                if (path.includes("broken")) {
                  return Effect.fail(
                    new SystemError({
                      method: "stat",
                      reason: "PermissionDenied",
                      module: "FileSystem",
                      cause: undefined,
                    }),
                  );
                }
                return Effect.succeed(
                  createFileInfo({
                    type: "Directory",
                    mtime: Option.some(date),
                  }),
                );
              },
              makeDirectory: () => Effect.void,
              writeFileString: () => Effect.void,
            }),
          ),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.projects.length).toBe(2);
      expect(
        result.projects.every((p) => p.claudeProjectPath.match(/project[12]$/)),
      ).toBe(true);
    });
  });
});
