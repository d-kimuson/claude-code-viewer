import { FileSystem, Path } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import { Effect, Layer, Option } from "effect";
import { PersistentService } from "../../../lib/storage/FileCacheStorage/PersistentService";
import type { ProjectMeta } from "../../types";
import { ProjectMetaService } from "../services/ProjectMetaService";
import { ProjectRepository } from "./ProjectRepository";

/**
 * Helper function to create FileSystem mock layer
 */
const makeFileSystemMock = (
  overrides: Partial<FileSystem.FileSystem>,
): Layer.Layer<FileSystem.FileSystem> => {
  return FileSystem.layerNoop(overrides);
};

/**
 * Helper function to create Path mock layer
 */
const makePathMock = (): Layer.Layer<Path.Path> => {
  return Path.layer;
};

/**
 * Helper function to create PersistentService mock layer
 */
const makePersistentServiceMock = (): Layer.Layer<PersistentService> => {
  return Layer.succeed(PersistentService, {
    load: () => Effect.succeed([]),
    save: () => Effect.void,
  });
};

/**
 * Helper function to create ProjectMetaService mock layer
 */
const makeProjectMetaServiceMock = (
  meta: ProjectMeta,
): Layer.Layer<ProjectMetaService> => {
  return Layer.succeed(ProjectMetaService, {
    getProjectMeta: () => Effect.succeed(meta),
    invalidateProject: () => Effect.void,
  });
};

/**
 * Helper function to create File.Info mock
 */
const makeFileInfoMock = (
  type: "File" | "Directory",
  mtime: Date,
): FileSystem.File.Info => ({
  type,
  mtime: Option.some(mtime),
  atime: Option.none(),
  birthtime: Option.none(),
  dev: 0,
  ino: Option.none(),
  mode: 0o755,
  nlink: Option.none(),
  uid: Option.none(),
  gid: Option.none(),
  rdev: Option.none(),
  size: FileSystem.Size(0n),
  blksize: Option.none(),
  blocks: Option.none(),
});

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

      const FileSystemMock = makeFileSystemMock({
        exists: (path: string) => Effect.succeed(path === projectPath),
        stat: () => Effect.succeed(makeFileInfoMock("Directory", mockDate)),
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();
      const ProjectMetaServiceMock = makeProjectMetaServiceMock(mockMeta);

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProject(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(ProjectMetaServiceMock),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
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

      const FileSystemMock = makeFileSystemMock({
        exists: () => Effect.succeed(false),
        stat: () => Effect.succeed(makeFileInfoMock("Directory", new Date())),
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();
      const ProjectMetaServiceMock = makeProjectMetaServiceMock(mockMeta);

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProject(projectId);
      });

      await expect(
        Effect.runPromise(
          program.pipe(
            Effect.provide(ProjectRepository.Live),
            Effect.provide(ProjectMetaServiceMock),
            Effect.provide(FileSystemMock),
            Effect.provide(PathMock),
            Effect.provide(PersistentServiceMock),
          ),
        ),
      ).rejects.toThrow("Project not found");
    });
  });

  describe("getProjects", () => {
    it("returns empty array when project directory does not exist", async () => {
      const FileSystemMock = makeFileSystemMock({
        exists: () => Effect.succeed(false),
        readDirectory: () => Effect.succeed([]),
        stat: () => Effect.succeed(makeFileInfoMock("Directory", new Date())),
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();
      const mockMeta: ProjectMeta = {
        projectName: null,
        projectPath: null,
        sessionCount: 0,
      };
      const ProjectMetaServiceMock = makeProjectMetaServiceMock(mockMeta);

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(ProjectMetaServiceMock),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(result.projects).toEqual([]);
    });

    it("returns multiple projects correctly sorted", async () => {
      const date1 = new Date("2024-01-01T00:00:00.000Z");
      const date2 = new Date("2024-01-02T00:00:00.000Z");
      const date3 = new Date("2024-01-03T00:00:00.000Z");

      const FileSystemMock = makeFileSystemMock({
        exists: () => Effect.succeed(true),
        readDirectory: () =>
          Effect.succeed(["project1", "project2", "project3"]),
        readFileString: () =>
          Effect.succeed('{"type":"user","cwd":"/workspace","text":"test"}'),
        stat: (path: string) => {
          if (path.includes("project1")) {
            return Effect.succeed(makeFileInfoMock("Directory", date2));
          }
          if (path.includes("project2")) {
            return Effect.succeed(makeFileInfoMock("Directory", date3));
          }
          if (path.includes("project3")) {
            return Effect.succeed(makeFileInfoMock("Directory", date1));
          }
          return Effect.succeed(makeFileInfoMock("Directory", new Date()));
        },
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(result.projects.length).toBe(3);
      expect(result.projects.at(0)?.lastModifiedAt).toEqual(date3); // project2
      expect(result.projects.at(1)?.lastModifiedAt).toEqual(date2); // project1
      expect(result.projects.at(2)?.lastModifiedAt).toEqual(date1); // project3
    });

    it("filters only directories", async () => {
      const date = new Date("2024-01-01T00:00:00.000Z");

      const FileSystemMock = makeFileSystemMock({
        exists: () => Effect.succeed(true),
        readDirectory: () =>
          Effect.succeed(["project1", "file.txt", "project2"]),
        readFileString: () =>
          Effect.succeed('{"type":"user","cwd":"/workspace","text":"test"}'),
        stat: (path: string) => {
          if (path.includes("file.txt")) {
            return Effect.succeed(makeFileInfoMock("File", date));
          }
          return Effect.succeed(makeFileInfoMock("Directory", date));
        },
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(result.projects.length).toBe(2);
      expect(
        result.projects.every((p) => p.claudeProjectPath.match(/project[12]$/)),
      ).toBe(true);
    });

    it("skips entries where stat retrieval fails", async () => {
      const date = new Date("2024-01-01T00:00:00.000Z");

      const FileSystemMock = makeFileSystemMock({
        exists: () => Effect.succeed(true),
        readDirectory: () => Effect.succeed(["project1", "broken", "project2"]),
        readFileString: () =>
          Effect.succeed('{"type":"user","cwd":"/workspace","text":"test"}'),
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
          return Effect.succeed(makeFileInfoMock("Directory", date));
        },
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const repo = yield* ProjectRepository;
        return yield* repo.getProjects();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectRepository.Live),
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(result.projects.length).toBe(2);
      expect(
        result.projects.every((p) => p.claudeProjectPath.match(/project[12]$/)),
      ).toBe(true);
    });
  });
});
