import { FileSystem, Path } from "@effect/platform";
import { Effect, Layer, Option } from "effect";
import { PersistentService } from "../../lib/storage/FileCacheStorage/PersistantService";
import { ProjectMetaService } from "./ProjectMetaService";

/**
 * Helper function to create a FileSystem mock layer
 * @see FileSystem.layerNoop - Can override only necessary methods
 */
const makeFileSystemMock = (
  overrides: Partial<FileSystem.FileSystem>,
): Layer.Layer<FileSystem.FileSystem> => {
  return FileSystem.layerNoop(overrides);
};

/**
 * Helper function to create a Path mock layer
 * @see Path.layer - Uses default POSIX Path implementation
 */
const makePathMock = (): Layer.Layer<Path.Path> => {
  return Path.layer;
};

/**
 * Helper function to create a PersistentService mock layer
 */
const makePersistentServiceMock = (): Layer.Layer<PersistentService> => {
  return Layer.succeed(PersistentService, {
    load: () => Effect.succeed([]),
    save: () => Effect.void,
  });
};

describe("ProjectMetaService", () => {
  describe("getProjectMeta", () => {
    it("returns cached metadata", async () => {
      let readDirectoryCalls = 0;

      const FileSystemMock = makeFileSystemMock({
        readDirectory: () => {
          readDirectoryCalls++;
          return Effect.succeed(["session1.jsonl"]);
        },
        readFileString: () =>
          Effect.succeed(
            '{"type":"user","cwd":"/workspace/app","text":"test"}',
          ),
        stat: () =>
          Effect.succeed({
            type: "File",
            mtime: Option.some(new Date("2024-01-01")),
            atime: Option.none(),
            birthtime: Option.none(),
            dev: 0,
            ino: Option.none(),
            mode: 0,
            nlink: Option.none(),
            uid: Option.none(),
            gid: Option.none(),
            rdev: Option.none(),
            size: FileSystem.Size(0n),
            blksize: Option.none(),
            blocks: Option.none(),
          }),
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();

      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* ProjectMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");

        // First call
        const result1 = yield* storage.getProjectMeta(projectId);

        // Second call (retrieved from cache)
        const result2 = yield* storage.getProjectMeta(projectId);

        return { result1, result2, readDirectoryCalls };
      });

      const { result1, result2 } = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      // Both results are the same
      expect(result1).toEqual(result2);

      // readDirectory is called only once (cache is working)
      expect(readDirectoryCalls).toBe(1);
    });

    it("returns null if project path is not found", async () => {
      const FileSystemMock = makeFileSystemMock({
        readDirectory: () => Effect.succeed(["session1.jsonl"]),
        readFileString: () =>
          Effect.succeed('{"type":"summary","text":"summary"}'),
        stat: () =>
          Effect.succeed({
            type: "File",
            mtime: Option.some(new Date("2024-01-01")),
            atime: Option.none(),
            birthtime: Option.none(),
            dev: 0,
            ino: Option.none(),
            mode: 0,
            nlink: Option.none(),
            uid: Option.none(),
            gid: Option.none(),
            rdev: Option.none(),
            size: FileSystem.Size(0n),
            blksize: Option.none(),
            blocks: Option.none(),
          }),
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();

      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* ProjectMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        return yield* storage.getProjectMeta(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(result.projectName).toBeNull();
      expect(result.projectPath).toBeNull();
      expect(result.sessionCount).toBe(1);
    });
  });

  describe("invalidateProject", () => {
    it("can invalidate project cache", async () => {
      let readDirectoryCalls = 0;

      const FileSystemMock = makeFileSystemMock({
        readDirectory: () => {
          readDirectoryCalls++;
          return Effect.succeed(["session1.jsonl"]);
        },
        readFileString: () =>
          Effect.succeed(
            '{"type":"user","cwd":"/workspace/app","text":"test"}',
          ),
        stat: () =>
          Effect.succeed({
            type: "File",
            mtime: Option.some(new Date("2024-01-01")),
            atime: Option.none(),
            birthtime: Option.none(),
            dev: 0,
            ino: Option.none(),
            mode: 0,
            nlink: Option.none(),
            uid: Option.none(),
            gid: Option.none(),
            rdev: Option.none(),
            size: FileSystem.Size(0n),
            blksize: Option.none(),
            blocks: Option.none(),
          }),
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();

      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* ProjectMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");

        // First call
        yield* storage.getProjectMeta(projectId);

        // Invalidate cache
        yield* storage.invalidateProject(projectId);

        // Second call (re-read from file)
        yield* storage.getProjectMeta(projectId);
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      // readDirectory is called twice (cache was invalidated)
      expect(readDirectoryCalls).toBe(2);
    });
  });
});
