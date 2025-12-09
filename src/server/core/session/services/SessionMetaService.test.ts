import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
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
        readDirectory: () => Effect.succeed([]),
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
        readDirectory: () => Effect.succeed([]),
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
        readDirectory: () => Effect.succeed([]),
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
        readDirectory: () => Effect.succeed([]),
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
        readDirectory: () => Effect.succeed([]),
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
        readDirectory: () => Effect.succeed([]),
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
        readDirectory: () => Effect.succeed([]),
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

    it("calculates costs correctly with mixed models (Haiku + Opus)", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: () =>
          Effect.succeed(
            // First message: Haiku with 1M input tokens ($0.25/MTok) and 1M output tokens ($1.25/MTok)
            '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-haiku-20240307","content":[],"usage":{"input_tokens":1000000,"output_tokens":1000000,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}\n' +
              // Second message: Opus with 1M input tokens ($15/MTok) and 1M output tokens ($75/MTok)
              '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440002","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-opus-20240229","content":[],"usage":{"input_tokens":1000000,"output_tokens":1000000,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}',
          ),
        readDirectory: () => Effect.succeed([]),
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

      // Verify aggregated token counts
      expect(result.cost.tokenUsage.inputTokens).toBe(2000000);
      expect(result.cost.tokenUsage.outputTokens).toBe(2000000);

      // Expected cost calculation:
      // Haiku: 1M input * $0.25 + 1M output * $1.25 = $0.25 + $1.25 = $1.50
      // Opus: 1M input * $15 + 1M output * $75 = $15 + $75 = $90
      // Total: $1.50 + $90 = $91.50
      const expectedTotal = 1.5 + 90.0;
      expect(result.cost.totalUsd).toBeCloseTo(expectedTotal, 2);

      // Verify breakdown shows correct aggregated costs
      // Input: Haiku $0.25 + Opus $15 = $15.25
      expect(result.cost.breakdown.inputTokensUsd).toBeCloseTo(15.25, 2);
      // Output: Haiku $1.25 + Opus $75 = $76.25
      expect(result.cost.breakdown.outputTokensUsd).toBeCloseTo(76.25, 2);
    });
  });

  describe("caching with agent sessions", () => {
    it("caches metadata including agent session costs", async () => {
      let mainFileReads = 0;
      let agentFileReads = 0;
      let directoryReads = 0;

      const FileSystemMock = makeFileSystemMock({
        readFileString: (path: string) => {
          if (path === "/test/project/session.jsonl") {
            mainFileReads++;
            return Effect.succeed(
              '{"type":"user","uuid":"550e8400-e29b-41d4-a716-446655440000","timestamp":"2024-01-01T00:00:00.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":null,"message":{"role":"user","content":"test"}}\n{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}',
            );
          }
          if (path === "/test/project/agent-hash-1.jsonl") {
            agentFileReads++;
            return Effect.succeed(
              '{"type":"assistant","uuid":"a1111111-1111-4111-a111-111111111111","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":300,"output_tokens":150,"cache_creation_input_tokens":50,"cache_read_input_tokens":25},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}',
            );
          }
          return Effect.fail({
            _tag: "SystemError",
            reason: "NotFound",
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            message: `File not found: ${path}`,
          } as PlatformError);
        },
        readDirectory: (dirPath: string) => {
          if (dirPath === "/test/project") {
            directoryReads++;
            return Effect.succeed([
              "session.jsonl",
              "agent-hash-1.jsonl",
              "other-file.txt",
            ]);
          }
          return Effect.succeed([]);
        },
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = "session"; // encodeSessionId("/test/project/session.jsonl") returns "session"

        // First call - should read files
        const result1 = yield* storage.getSessionMeta(projectId, sessionId);

        // Second call - should use cache
        const result2 = yield* storage.getSessionMeta(projectId, sessionId);

        return { result1, result2 };
      });

      const { result1, result2 } = await Effect.runPromise(
        program.pipe(
          Effect.provide(SessionMetaService.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(PathMock),
          Effect.provide(PersistentServiceMock),
        ),
      );

      // Both results should be identical (from cache)
      expect(result1).toEqual(result2);

      // Verify costs include agent session
      expect(result1.cost.tokenUsage.inputTokens).toBe(1300);
      expect(result1.cost.tokenUsage.outputTokens).toBe(650);

      // Files should only be read once (second call uses cache)
      expect(mainFileReads).toBe(1);
      // Agent files are read twice: once in getAgentSessionFilesForSession to check sessionId,
      // and once more to get the actual content
      expect(agentFileReads).toBe(2);
      expect(directoryReads).toBe(1);
    });

    it("invalidates cache and re-reads all files including agent sessions", async () => {
      let mainFileReads = 0;
      let agentFileReads = 0;
      let directoryReads = 0;

      const FileSystemMock = makeFileSystemMock({
        readFileString: (path: string) => {
          if (path === "/test/project/session.jsonl") {
            mainFileReads++;
            return Effect.succeed(
              '{"type":"user","uuid":"550e8400-e29b-41d4-a716-446655440000","timestamp":"2024-01-01T00:00:00.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":null,"message":{"role":"user","content":"test"}}\n{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}',
            );
          }
          if (path === "/test/project/agent-hash-1.jsonl") {
            agentFileReads++;
            return Effect.succeed(
              '{"type":"assistant","uuid":"a1111111-1111-4111-a111-111111111111","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":300,"output_tokens":150,"cache_creation_input_tokens":50,"cache_read_input_tokens":25},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}',
            );
          }
          return Effect.fail({
            _tag: "SystemError",
            reason: "NotFound",
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            message: `File not found: ${path}`,
          } as PlatformError);
        },
        readDirectory: (dirPath: string) => {
          if (dirPath === "/test/project") {
            directoryReads++;
            return Effect.succeed([
              "session.jsonl",
              "agent-hash-1.jsonl",
              "other-file.txt",
            ]);
          }
          return Effect.succeed([]);
        },
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = "session";

        // First call
        yield* storage.getSessionMeta(projectId, sessionId);

        // Invalidate cache
        yield* storage.invalidateSession(projectId, sessionId);

        // Second call after invalidation
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

      // Files should be read twice (once before invalidation, once after)
      expect(mainFileReads).toBe(2);
      // Agent files are read 4 times: 2 reads per getSessionMeta call
      // (once to check sessionId, once to get content)
      expect(agentFileReads).toBe(4);
      expect(directoryReads).toBe(2);
    });
  });

  describe("agent session integration", () => {
    it("includes costs from agent session files", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: (path: string) => {
          if (path === "/test/project/session.jsonl") {
            // Main session file with 1000 input tokens and 500 output tokens
            return Effect.succeed(
              '{"type":"user","uuid":"550e8400-e29b-41d4-a716-446655440000","timestamp":"2024-01-01T00:00:00.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":null,"message":{"role":"user","content":"test"}}\n{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}',
            );
          }
          if (path === "/test/project/agent-hash-1.jsonl") {
            // Agent session file with 300 input tokens and 150 output tokens
            return Effect.succeed(
              '{"type":"assistant","uuid":"a1111111-1111-4111-a111-111111111111","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":300,"output_tokens":150,"cache_creation_input_tokens":50,"cache_read_input_tokens":25},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}',
            );
          }
          return Effect.fail({
            _tag: "SystemError",
            reason: "NotFound",
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            message: `File not found: ${path}`,
          } as PlatformError);
        },
        readDirectory: (dirPath: string) => {
          if (dirPath === "/test/project") {
            return Effect.succeed([
              "session.jsonl",
              "agent-hash-1.jsonl",
              "other-file.txt",
            ]);
          }
          return Effect.succeed([]);
        },
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = "session";

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

      // Verify costs include both main and agent sessions
      // Main: input=1000, output=500
      // Agent: input=300, output=150, cache_creation=50, cache_read=25
      // Total: input=1300, output=650, cache_creation=50, cache_read=25
      expect(result.cost.tokenUsage.inputTokens).toBe(1300);
      expect(result.cost.tokenUsage.outputTokens).toBe(650);
      expect(result.cost.tokenUsage.cacheCreationTokens).toBe(50);
      expect(result.cost.tokenUsage.cacheReadTokens).toBe(25);
      expect(result.cost.totalUsd).toBeGreaterThan(0);
    });

    it("includes costs from multiple agent session files", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: (path: string) => {
          if (path === "/test/project/session.jsonl") {
            return Effect.succeed(
              '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}',
            );
          }
          if (path === "/test/project/agent-hash-1.jsonl") {
            return Effect.succeed(
              '{"type":"assistant","uuid":"a1111111-1111-4111-a111-111111111111","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":200,"output_tokens":100,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}',
            );
          }
          if (path === "/test/project/agent-hash-2.jsonl") {
            return Effect.succeed(
              '{"type":"assistant","uuid":"a2222222-2222-4222-a222-222222222222","timestamp":"2024-01-01T00:00:03.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"a1111111-1111-4111-a111-111111111111","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":300,"output_tokens":150,"cache_creation_input_tokens":50,"cache_read_input_tokens":25},"stop_reason":null,"stop_sequence":null,"id":"msg_03"}}',
            );
          }
          return Effect.fail({
            _tag: "SystemError",
            reason: "NotFound",
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            message: `File not found: ${path}`,
          } as PlatformError);
        },
        readDirectory: (dirPath: string) => {
          if (dirPath === "/test/project") {
            return Effect.succeed([
              "session.jsonl",
              "agent-hash-1.jsonl",
              "agent-hash-2.jsonl",
            ]);
          }
          return Effect.succeed([]);
        },
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = "session";

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

      // Main: input=1000, output=500
      // Agent1: input=200, output=100
      // Agent2: input=300, output=150, cache_creation=50, cache_read=25
      // Total: input=1500, output=750, cache_creation=50, cache_read=25
      expect(result.cost.tokenUsage.inputTokens).toBe(1500);
      expect(result.cost.tokenUsage.outputTokens).toBe(750);
      expect(result.cost.tokenUsage.cacheCreationTokens).toBe(50);
      expect(result.cost.tokenUsage.cacheReadTokens).toBe(25);
    });

    it("handles case when no agent files exist", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: (path: string) => {
          if (path === "/test/project/session.jsonl") {
            return Effect.succeed(
              '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}',
            );
          }
          return Effect.fail({
            _tag: "SystemError",
            reason: "NotFound",
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            message: `File not found: ${path}`,
          } as PlatformError);
        },
        readDirectory: (dirPath: string) => {
          if (dirPath === "/test/project") {
            return Effect.succeed(["session.jsonl", "other-file.txt"]);
          }
          return Effect.succeed([]);
        },
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = "session";

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

      // Only main session costs
      expect(result.cost.tokenUsage.inputTokens).toBe(1000);
      expect(result.cost.tokenUsage.outputTokens).toBe(500);
    });

    it("skips agent files that do not match the sessionId", async () => {
      const FileSystemMock = makeFileSystemMock({
        readFileString: (path: string) => {
          if (path === "/test/project/session.jsonl") {
            return Effect.succeed(
              '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}',
            );
          }
          if (path === "/test/project/agent-matching.jsonl") {
            return Effect.succeed(
              '{"type":"assistant","uuid":"a1111111-1111-4111-a111-111111111111","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":300,"output_tokens":150,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}',
            );
          }
          if (path === "/test/project/agent-different.jsonl") {
            return Effect.succeed(
              '{"type":"assistant","uuid":"b1111111-1111-4111-b111-111111111111","timestamp":"2024-01-01T00:00:03.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"different-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":999999,"output_tokens":999999,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_03"}}',
            );
          }
          return Effect.fail({
            _tag: "SystemError",
            reason: "NotFound",
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            message: `File not found: ${path}`,
          } as PlatformError);
        },
        readDirectory: (dirPath: string) => {
          if (dirPath === "/test/project") {
            return Effect.succeed([
              "session.jsonl",
              "agent-matching.jsonl",
              "agent-different.jsonl",
            ]);
          }
          return Effect.succeed([]);
        },
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.void,
      });

      const PathMock = makePathMock();
      const PersistentServiceMock = makePersistentServiceMock();

      const program = Effect.gen(function* () {
        const storage = yield* SessionMetaService;
        const projectId = Buffer.from("/test/project").toString("base64url");
        const sessionId = "session";

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

      // Main: input=1000, output=500
      // Agent matching: input=300, output=150
      // Agent different: should NOT be included (different sessionId)
      // Total: input=1300, output=650
      expect(result.cost.tokenUsage.inputTokens).toBe(1300);
      expect(result.cost.tokenUsage.outputTokens).toBe(650);
    });
  });
});
