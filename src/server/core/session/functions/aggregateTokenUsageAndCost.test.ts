import { describe, expect, test } from "vitest";
import { aggregateTokenUsageAndCost } from "./aggregateTokenUsageAndCost";

describe("aggregateTokenUsageAndCost", () => {
  describe("single file", () => {
    test("aggregates costs from single file content", () => {
      const content =
        '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":100,"cache_read_input_tokens":50},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}';

      const result = aggregateTokenUsageAndCost([content]);

      expect(result.totalUsage.input_tokens).toBe(1000);
      expect(result.totalUsage.output_tokens).toBe(500);
      expect(result.totalUsage.cache_creation_input_tokens).toBe(100);
      expect(result.totalUsage.cache_read_input_tokens).toBe(50);
      expect(result.totalCost.totalUsd).toBeGreaterThan(0);
      expect(result.modelName).toBe("claude-3-5-sonnet-20240620");
    });

    test("handles multiple assistant messages in single file", () => {
      const content =
        '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":500,"output_tokens":250,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}\n' +
        '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440002","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":300,"output_tokens":150,"cache_creation_input_tokens":100,"cache_read_input_tokens":50},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}';

      const result = aggregateTokenUsageAndCost([content]);

      expect(result.totalUsage.input_tokens).toBe(800); // 500 + 300
      expect(result.totalUsage.output_tokens).toBe(400); // 250 + 150
      expect(result.totalUsage.cache_creation_input_tokens).toBe(100);
      expect(result.totalUsage.cache_read_input_tokens).toBe(50);
    });

    test("returns zero cost for file with no assistant messages", () => {
      const content =
        '{"type":"user","message":{"role":"user","content":"test message"}}';

      const result = aggregateTokenUsageAndCost([content]);

      expect(result.totalUsage.input_tokens).toBe(0);
      expect(result.totalUsage.output_tokens).toBe(0);
      expect(result.totalCost.totalUsd).toBe(0);
      expect(result.modelName).toBe("claude-3.5-sonnet"); // Default model
    });
  });

  describe("multiple files", () => {
    test("aggregates costs from multiple file contents", () => {
      const mainFileContent =
        '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":100,"cache_read_input_tokens":50},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}';

      const agentFileContent =
        '{"type":"assistant","uuid":"a1111111-1111-4111-a111-111111111111","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":300,"output_tokens":150,"cache_creation_input_tokens":50,"cache_read_input_tokens":25},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}';

      const result = aggregateTokenUsageAndCost([
        mainFileContent,
        agentFileContent,
      ]);

      // Main file: input=1000, output=500, cache_creation=100, cache_read=50
      // Agent file: input=300, output=150, cache_creation=50, cache_read=25
      // Total: input=1300, output=650, cache_creation=150, cache_read=75
      expect(result.totalUsage.input_tokens).toBe(1300);
      expect(result.totalUsage.output_tokens).toBe(650);
      expect(result.totalUsage.cache_creation_input_tokens).toBe(150);
      expect(result.totalUsage.cache_read_input_tokens).toBe(75);
      expect(result.totalCost.totalUsd).toBeGreaterThan(0);
    });

    test("aggregates costs from multiple agent files", () => {
      const mainFileContent =
        '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}';

      const agent1Content =
        '{"type":"assistant","uuid":"a1111111-1111-4111-a111-111111111111","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":200,"output_tokens":100,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}';

      const agent2Content =
        '{"type":"assistant","uuid":"a2222222-2222-4222-a222-222222222222","timestamp":"2024-01-01T00:00:03.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"a1111111-1111-4111-a111-111111111111","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":300,"output_tokens":150,"cache_creation_input_tokens":50,"cache_read_input_tokens":25},"stop_reason":null,"stop_sequence":null,"id":"msg_03"}}';

      const result = aggregateTokenUsageAndCost([
        mainFileContent,
        agent1Content,
        agent2Content,
      ]);

      // Main: input=1000, output=500
      // Agent1: input=200, output=100
      // Agent2: input=300, output=150, cache_creation=50, cache_read=25
      // Total: input=1500, output=750, cache_creation=50, cache_read=25
      expect(result.totalUsage.input_tokens).toBe(1500);
      expect(result.totalUsage.output_tokens).toBe(750);
      expect(result.totalUsage.cache_creation_input_tokens).toBe(50);
      expect(result.totalUsage.cache_read_input_tokens).toBe(25);
    });

    test("handles mixed models across files correctly", () => {
      const haikuFileContent =
        '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-haiku-20240307","content":[],"usage":{"input_tokens":1000000,"output_tokens":1000000,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}';

      const opusFileContent =
        '{"type":"assistant","uuid":"a1111111-1111-4111-a111-111111111111","timestamp":"2024-01-01T00:00:02.000Z","isSidechain":true,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440001","message":{"type":"message","role":"assistant","model":"claude-3-opus-20240229","content":[],"usage":{"input_tokens":1000000,"output_tokens":1000000,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_02"}}';

      const result = aggregateTokenUsageAndCost([
        haikuFileContent,
        opusFileContent,
      ]);

      // Verify aggregated token counts
      expect(result.totalUsage.input_tokens).toBe(2000000);
      expect(result.totalUsage.output_tokens).toBe(2000000);

      // Expected cost calculation:
      // Haiku: 1M input * $0.25 + 1M output * $1.25 = $0.25 + $1.25 = $1.50
      // Opus: 1M input * $15 + 1M output * $75 = $15 + $75 = $90
      // Total: $1.50 + $90 = $91.50
      const expectedTotal = 1.5 + 90.0;
      expect(result.totalCost.totalUsd).toBeCloseTo(expectedTotal, 2);

      // Verify breakdown shows correct aggregated costs
      // Input: Haiku $0.25 + Opus $15 = $15.25
      expect(result.totalCost.breakdown.inputTokensUsd).toBeCloseTo(15.25, 2);
      // Output: Haiku $1.25 + Opus $75 = $76.25
      expect(result.totalCost.breakdown.outputTokensUsd).toBeCloseTo(76.25, 2);

      // Last model should be from the last file
      expect(result.modelName).toBe("claude-3-opus-20240229");
    });

    test("handles empty file contents in the array", () => {
      const mainFileContent =
        '{"type":"assistant","uuid":"550e8400-e29b-41d4-a716-446655440001","timestamp":"2024-01-01T00:00:01.000Z","isSidechain":false,"userType":"external","cwd":"/test","sessionId":"test-session","version":"1.0.0","parentUuid":"550e8400-e29b-41d4-a716-446655440000","message":{"type":"message","role":"assistant","model":"claude-3-5-sonnet-20240620","content":[],"usage":{"input_tokens":1000,"output_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":null,"stop_sequence":null,"id":"msg_01"}}';

      const emptyFileContent = "";

      const result = aggregateTokenUsageAndCost([
        mainFileContent,
        emptyFileContent,
      ]);

      // Should only count tokens from the main file
      expect(result.totalUsage.input_tokens).toBe(1000);
      expect(result.totalUsage.output_tokens).toBe(500);
    });
  });

  describe("edge cases", () => {
    test("handles empty array", () => {
      const result = aggregateTokenUsageAndCost([]);

      expect(result.totalUsage.input_tokens).toBe(0);
      expect(result.totalUsage.output_tokens).toBe(0);
      expect(result.totalCost.totalUsd).toBe(0);
      expect(result.modelName).toBe("claude-3.5-sonnet"); // Default
    });

    test("handles array with only empty strings", () => {
      const result = aggregateTokenUsageAndCost(["", "", ""]);

      expect(result.totalUsage.input_tokens).toBe(0);
      expect(result.totalUsage.output_tokens).toBe(0);
      expect(result.totalCost.totalUsd).toBe(0);
    });

    test("handles files with only user messages", () => {
      const userOnlyContent1 =
        '{"type":"user","message":{"role":"user","content":"test 1"}}';
      const userOnlyContent2 =
        '{"type":"user","message":{"role":"user","content":"test 2"}}';

      const result = aggregateTokenUsageAndCost([
        userOnlyContent1,
        userOnlyContent2,
      ]);

      expect(result.totalUsage.input_tokens).toBe(0);
      expect(result.totalUsage.output_tokens).toBe(0);
      expect(result.totalCost.totalUsd).toBe(0);
    });
  });
});
