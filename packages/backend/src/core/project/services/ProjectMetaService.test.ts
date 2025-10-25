import { FileSystem } from "@effect/platform";
import { Effect, Option } from "effect";
import { testFileSystemLayer } from "../../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../../testing/layers/testPlatformLayer";
import { ProjectMetaService } from "../services/ProjectMetaService";

describe("ProjectMetaService", () => {
  describe("getProjectMeta", () => {
    it("returns cached metadata", async () => {
      let readDirectoryCalls = 0;

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
          Effect.provide(
            testFileSystemLayer({
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
            }),
          ),
          Effect.provide(testPlatformLayer()),
        ),
      );

      // Both results are the same
      expect(result1).toEqual(result2);

      // readDirectory is called only once (cache is working)
      expect(readDirectoryCalls).toBe(1);
    });

    it("returns null if project path is not found", async () => {
      const program = Effect.gen(function* () {
        const storage = yield* ProjectMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        return yield* storage.getProjectMeta(projectId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProjectMetaService.Live),
          Effect.provide(
            testFileSystemLayer({
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
            }),
          ),
          Effect.provide(testPlatformLayer()),
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
          Effect.provide(
            testFileSystemLayer({
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
            }),
          ),
          Effect.provide(testPlatformLayer()),
        ),
      );

      // readDirectory is called twice (cache was invalidated)
      expect(readDirectoryCalls).toBe(2);
    });
  });
});
