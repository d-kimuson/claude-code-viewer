import { resolve } from "node:path";
import { NodeFileSystem } from "@effect/platform-node";
import { describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import { encodeProjectId } from "../../project/functions/id.ts";
import { AgentSessionMappingService } from "./AgentSessionMappingService.ts";

const testLayer = Layer.mergeAll(testPlatformLayer(), NodeFileSystem.layer);

describe("AgentSessionMappingService", () => {
  const sampleProjectPath = resolve(
    process.cwd(),
    "mock-global-claude-dir/projects/sample-project",
  );
  const sampleProjectId = encodeProjectId(sampleProjectPath);
  const sampleSessionId = "5c0375b4-57a5-4f26-b12d-d022ee4e51b7";

  describe("getAgentFilePath", () => {
    it.live("should return agent file path for matching sessionId and prompt", () =>
      Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;
        const result = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Run the test suite",
        );

        expect(result).toBe(resolve(sampleProjectPath, "agent-test-hash-123.jsonl"));
      }).pipe(Effect.provide(AgentSessionMappingService.Live), Effect.provide(testLayer)),
    );

    it.live("should return null for non-matching prompt", () =>
      Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;
        const result = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "Non-existing prompt",
        );

        expect(result).toBeNull();
      }).pipe(Effect.provide(AgentSessionMappingService.Live), Effect.provide(testLayer)),
    );

    it.live("should return null for non-matching sessionId", () =>
      Effect.gen(function* () {
        const nonExistingSessionId = "non-existing-session-id";

        const service = yield* AgentSessionMappingService;
        const result = yield* service.getAgentFilePath(
          sampleProjectId,
          nonExistingSessionId,
          "Run the test suite",
        );

        expect(result).toBeNull();
      }).pipe(Effect.provide(AgentSessionMappingService.Live), Effect.provide(testLayer)),
    );

    it.live("should handle prompts with different whitespace", () =>
      Effect.gen(function* () {
        const service = yield* AgentSessionMappingService;
        const result = yield* service.getAgentFilePath(
          sampleProjectId,
          sampleSessionId,
          "RUN   THE\n  TEST   SUITE",
        );

        expect(result).toBe(resolve(sampleProjectPath, "agent-test-hash-123.jsonl"));
      }).pipe(Effect.provide(AgentSessionMappingService.Live), Effect.provide(testLayer)),
    );

    it.live("should cache results", () =>
      Effect.gen(function* () {
        let callCount = 0;

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

        const expectedPath = resolve(sampleProjectPath, "agent-test-hash-456.jsonl");
        expect(result1).toBe(expectedPath);
        expect(result2).toBe(expectedPath);
        expect(callCount).toBe(2);
      }).pipe(Effect.provide(AgentSessionMappingService.Live), Effect.provide(testLayer)),
    );

    it.live("should handle multiple agent files in the same project", () =>
      Effect.gen(function* () {
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

        expect(result1).toBe(resolve(sampleProjectPath, "agent-test-hash-123.jsonl"));
        expect(result2).toBe(resolve(sampleProjectPath, "agent-test-hash-456.jsonl"));
      }).pipe(Effect.provide(AgentSessionMappingService.Live), Effect.provide(testLayer)),
    );
  });

  describe("invalidateSession", () => {
    it.live("should clear cache entries for a session", () =>
      Effect.gen(function* () {
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

        const expectedPath = resolve(sampleProjectPath, "agent-test-hash-123.jsonl");
        expect(result1).toBe(expectedPath);
        expect(result2).toBe(expectedPath);
      }).pipe(Effect.provide(AgentSessionMappingService.Live), Effect.provide(testLayer)),
    );
  });

  describe("invalidateAgentFile", () => {
    it.live("should clear cache entries for an agent file", () =>
      Effect.gen(function* () {
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

        const expectedPath = resolve(sampleProjectPath, "agent-test-hash-123.jsonl");
        expect(result1).toBe(expectedPath);
        expect(result2).toBe(expectedPath);
      }).pipe(Effect.provide(AgentSessionMappingService.Live), Effect.provide(testLayer)),
    );
  });
});
