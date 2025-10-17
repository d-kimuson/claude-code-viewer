import { FileSystem, Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { PersistentService } from "../../../lib/storage/FileCacheStorage/PersistentService";
import { SessionMetaService } from "../services/SessionMetaService";

/**
 * Helper function to create a FileSystem mock layer
 */
const makeFileSystemMock = (
  overrides: Partial<FileSystem.FileSystem>,
): Layer.Layer<FileSystem.FileSystem> => {
  return FileSystem.layerNoop(overrides);
};

/**
 * Helper function to create a Path mock layer
 */
const makePathMock = (): Layer.Layer<Path.Path> => {
  return Path.layer;
};

/**
 * Helper function to create a PersistentService mock layer
 * load returns an empty array to avoid file system access
 */
const makePersistentServiceMock = (): Layer.Layer<PersistentService> => {
  return Layer.succeed(PersistentService, {
    load: (_key: string) => Effect.succeed([]),
    save: (_key: string, _entries: readonly [string, unknown][]) => Effect.void,
  });
};

describe("SessionMetaService", () => {
  describe("getSessionMeta", () => {
    it("can retrieve session metadata", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: () =>
          Effect.succeed(
            '{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/workspace/app","sessionId":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","version":"1.0.0","gitBranch":"","type":"user","message":{"role":"user","content":"test message"},"uuid":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","timestamp":"2024-01-01T00:00:00.000Z"}',
          ),
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = Buffer.from("/test/project/session.jsonl").toString(
          "base64url",
        );

        return yield* storage.getSessionMeta(projectId, sessionId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(result.messageCount).toBe(1);
      expect(result.firstUserMessage).toEqual({
        kind: "text",
        content: "test message",
      });
    });

    it("returns cached metadata", async () => {
      let readFileStringCalls = 0;

      const FileSystemMock = makeFileSystemMock({
        readFileString: () => {
          readFileStringCalls++;
          return Effect.succeed(
            '{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/workspace/app","sessionId":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","version":"1.0.0","gitBranch":"","type":"user","message":{"role":"user","content":"test message"},"uuid":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","timestamp":"2024-01-01T00:00:00.000Z"}',
          );
        },
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = Buffer.from("/test/project/session.jsonl").toString(
          "base64url",
        );

        // 1回目の呼び出し
        const result1 = yield* storage.getSessionMeta(projectId, sessionId);

        // 2回目の呼び出し（キャッシュから取得）
        const result2 = yield* storage.getSessionMeta(projectId, sessionId);

        return { result1, result2, readFileStringCalls };
      });

      const { result1, result2 } = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(result1).toEqual(result2);

      expect(readFileStringCalls).toBe(2);
    });

    it("correctly parses commands", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: () =>
          Effect.succeed(
            '{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/workspace/app","sessionId":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","version":"1.0.0","gitBranch":"","type":"user","message":{"role":"user","content":"<command-name>/test</command-name>"},"uuid":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","timestamp":"2024-01-01T00:00:00.000Z"}',
          ),
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = Buffer.from("/test/project/session.jsonl").toString(
          "base64url",
        );

        return yield* storage.getSessionMeta(projectId, sessionId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(result.firstUserMessage).toEqual({
        kind: "command",
        commandName: "/test",
      });
    });

    it("skips commands that should be ignored", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: () =>
          Effect.succeed(
            '{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/workspace/app","sessionId":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","version":"1.0.0","gitBranch":"","type":"user","message":{"role":"user","content":"<command-name>/clear</command-name>"},"uuid":"d78d1de2-52bd-4e64-ad0f-affcbcc1dabf","timestamp":"2024-01-01T00:00:00.000Z"}\n{"parentUuid":"d78d1de2-52bd-4e64-ad0f-affcbcc1dabf","isSidechain":false,"userType":"external","cwd":"/workspace/app","sessionId":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","version":"1.0.0","gitBranch":"","type":"user","message":{"role":"user","content":"actual message"},"uuid":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","timestamp":"2024-01-01T00:00:01.000Z"}',
          ),
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = Buffer.from("/test/project/session.jsonl").toString(
          "base64url",
        );

        return yield* storage.getSessionMeta(projectId, sessionId);
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(result.firstUserMessage).toEqual({
        kind: "text",
        content: "actual message",
      });
    });
  });

  describe("invalidateSession", () => {
    it("can invalidate session cache", async () => {
      let readFileStringCalls = 0;

      const FileSystemMock = makeFileSystemMock({
        readFileString: () => {
          readFileStringCalls++;
          return Effect.succeed(
            '{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/workspace/app","sessionId":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","version":"1.0.0","gitBranch":"","type":"user","message":{"role":"user","content":"test message"},"uuid":"e2ab9812-8be7-4e9e-8194-d9b7b9d6da14","timestamp":"2024-01-01T00:00:00.000Z"}',
          );
        },
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = Buffer.from("/test/project/session.jsonl").toString(
          "base64url",
        );

        yield* storage.getSessionMeta(projectId, sessionId);

        yield* storage.invalidateSession(projectId, sessionId);

        yield* storage.getSessionMeta(projectId, sessionId);
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      expect(readFileStringCalls).toBe(3);
    });
  });
});
