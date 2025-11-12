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

  describe("cost calculation", () => {
    it("calculates cost from assistant messages", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: () =>
          Effect.succeed(
            '{"type":"user","uuid":"550e8400-e29b-41d4-a716-446655440000","timestamp":"2024-01-01T00:00:00.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":null,"message":{"role":"user","content":"test"}}\n{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-sonnet-4-20250514","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":200,"cache_read_input_tokens":100},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}',
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

      // Verify cost is calculated
      expect(result.cost.tokenUsage.inputTokens).toBe(1000);
      expect(result.cost.tokenUsage.outputTokens).toBe(500);
      expect(result.cost.tokenUsage.cacheCreationTokens).toBe(200);
      expect(result.cost.tokenUsage.cacheReadTokens).toBe(100);

      // Verify cost breakdown is present
      expect(result.cost.breakdown.inputTokensUsd).toBeGreaterThan(0);
      expect(result.cost.breakdown.outputTokensUsd).toBeGreaterThan(0);
      expect(result.cost.totalUsd).toBeGreaterThan(0);
    });

    it("aggregates costs from multiple assistant messages", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: () =>
          Effect.succeed(
            '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":500,"output_tokens":250,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}\n{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440002","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":300,"output_tokens":150,"cache_creation_input_tokens":100,"cache_read_input_tokens":50},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}',
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

      // Verify costs are aggregated
      expect(result.cost.tokenUsage.inputTokens).toBe(800); // 500 + 300
      expect(result.cost.tokenUsage.outputTokens).toBe(400); // 250 + 150
      expect(result.cost.tokenUsage.cacheCreationTokens).toBe(100);
      expect(result.cost.tokenUsage.cacheReadTokens).toBe(50);
      expect(result.cost.totalUsd).toBeGreaterThan(0);
    });

    it("returns zero cost when no assistant messages exist", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: () =>
          Effect.succeed(
            '{"type":"user","message":{"role":"user","content":"test message"}}',
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

      // Verify zero cost
      expect(result.cost.tokenUsage.inputTokens).toBe(0);
      expect(result.cost.tokenUsage.outputTokens).toBe(0);
      expect(result.cost.totalUsd).toBe(0);
    });
  });
});
