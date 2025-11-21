import { resolve } from "node:path";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import { encodeProjectId } from "../../project/functions/id";
import { AgentSessionMappingService } from "./AgentSessionMappingService";

const testLayer = Layer.mergeAll(testPlatformLayer(), NodeFileSystem.layer);

describe("AgentSessionMappingService", () => {
  const sampleProjectPath = resolve(
    process.cwd(),
    "mock-global-claude-dir/projects/sample-project",
  );
  const sampleProjectId = encodeProjectId(sampleProjectPath);
  const sampleSessionId = "5c0375b4-57a5-4f26-b12d-d022ee4e51b7";

  describe("getAgentFilePath", () => {
    it("should return agent file path for matching sessionId and prompt", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;
        return yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Run the test suite",
        );
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(AgentSessionMappingService.Live),
          Effect.provide(testLayer),
        ),
      );

      expect(result).toBe(
        resolve(sampleProjectPath, "agent-test-hash-123.jsonl"),
      );
    });

    it("should return null for non-matching prompt", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;
        return yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Non-existing prompt",
        );
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(AgentSessionMappingService.Live),
          Effect.provide(testLayer),
        ),
      );

      expect(result).toBeNull();
    });

    it("should return null for non-matching sessionId", async () => {
      const nonExistingSessionId = "non-existing-session-id";

      const program = Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;
        return yield* service.getAgentFilePath(
          sampleProjectId,
          nonExistingSessionId,
          "Run the test suite",
        );
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(AgentSessionMappingService.Live),
          Effect.provide(testLayer),
        ),
      );

      expect(result).toBeNull();
    });

    it("should handle prompts with different whitespace", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;
        return yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "RUN   THE\n  TEST   SUITE",
        );
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(AgentSessionMappingService.Live),
          Effect.provide(testLayer),
        ),
      );

      expect(result).toBe(
        resolve(sampleProjectPath, "agent-test-hash-123.jsonl"),
      );
    });

    it("should cache results", async () => {
      let callCount = 0;

      const program = Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;

        // First call - should populate cache
        const result1 = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Build the project",
        );
        callCount++;

        // Second call - should hit cache
        const result2 = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Build the project",
        );
        callCount++;

        return { result1, result2 };
      });

      const { result1, result2 } = await Effect.runPromise(
        program.pipe(
          Effect.provide(AgentSessionMappingService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      const expectedPath = resolve(
        sampleProjectPath,
        "agent-test-hash-456.jsonl",
      );
      expect(result1).toBe(expectedPath);
      expect(result2).toBe(expectedPath);
      expect(callCount).toBe(2);
    });

    it("should handle multiple agent files in the same project", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;
        const result1 = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Run the test suite",
        );
        const result2 = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Build the project",
        );
        return { result1, result2 };
      });

      const { result1, result2 } = await Effect.runPromise(
        program.pipe(
          Effect.provide(AgentSessionMappingService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result1).toBe(
        resolve(sampleProjectPath, "agent-test-hash-123.jsonl"),
      );
      expect(result2).toBe(
        resolve(sampleProjectPath, "agent-test-hash-456.jsonl"),
      );
    });
  });

  describe("invalidateSession", () => {
    it("should clear cache entries for a session", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;

        // First call - populate cache
        const result1 = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Run the test suite",
        );

        // Invalidate
        yield* service.invalidateSession(sampleSessionId);

        // Second call - cache should be cleared, should re-populate
        const result2 = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Run the test suite",
        );

        return { result1, result2 };
      });

      const { result1, result2 } = await Effect.runPromise(
        program.pipe(
          Effect.provide(AgentSessionMappingService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      const expectedPath = resolve(
        sampleProjectPath,
        "agent-test-hash-123.jsonl",
      );
      expect(result1).toBe(expectedPath);
      expect(result2).toBe(expectedPath);
    });
  });

  describe("invalidateAgentFile", () => {
    it("should clear cache entries for an agent file", async () => {
      const program = Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;

        // First call - populate cache
        const result1 = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Run the test suite",
        );

        // Invalidate by agent session id
        yield* service.invalidateAgentFile("test-hash-123");

        // Second call - cache should be cleared, should re-populate
        const result2 = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Run the test suite",
        );

        return { result1, result2 };
      });

      const { result1, result2 } = await Effect.runPromise(
        program.pipe(
          Effect.provide(AgentSessionMappingService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      const expectedPath = resolve(
        sampleProjectPath,
        "agent-test-hash-123.jsonl",
      );
      expect(result1).toBe(expectedPath);
      expect(result2).toBe(expectedPath);
    });
  });
});
