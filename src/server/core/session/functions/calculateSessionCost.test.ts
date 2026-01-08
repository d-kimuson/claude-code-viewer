import { describe, expect, it } from "vitest";
import {
  calculateTokenCost,
  normalizeModelName,
  type TokenUsage,
} from "./calculateSessionCost";

describe("normalizeModelName", () => {
  it("should normalize claude-sonnet-4-20250514 to claude-3.5-sonnet", () => {
    expect(normalizeModelName("claude-sonnet-4-20250514")).toBe(
      "claude-3.5-sonnet",
    );
  });

  it("should normalize claude-3-5-sonnet-20240620 to claude-3.5-sonnet", () => {
    expect(normalizeModelName("claude-3-5-sonnet-20240620")).toBe(
      "claude-3.5-sonnet",
    );
  });

  it("should normalize claude-3-opus-20240229 to claude-3-opus", () => {
    expect(normalizeModelName("claude-3-opus-20240229")).toBe("claude-3-opus");
  });

  it("should normalize claude-3-haiku-20240307 to claude-3-haiku", () => {
    expect(normalizeModelName("claude-3-haiku-20240307")).toBe(
      "claude-3-haiku",
    );
  });

  it("should normalize claude-opus-4-1-20250101 to claude-opus-4.1", () => {
    expect(normalizeModelName("claude-opus-4-1-20250101")).toBe(
      "claude-opus-4.1",
    );
  });

  it("should normalize claude-opus-4-5-20251101 to claude-opus-4.5", () => {
    expect(normalizeModelName("claude-opus-4-5-20251101")).toBe(
      "claude-opus-4.5",
    );
  });

  it("should normalize claude-sonnet-4-5-20250929 to claude-sonnet-4.5", () => {
    expect(normalizeModelName("claude-sonnet-4-5-20250929")).toBe(
      "claude-sonnet-4.5",
    );
  });

  it("should normalize claude-haiku-4-5-20251001 to claude-haiku-4.5", () => {
    expect(normalizeModelName("claude-haiku-4-5-20251001")).toBe(
      "claude-haiku-4.5",
    );
  });

  it("should return claude-3.5-sonnet for unknown model", () => {
    expect(normalizeModelName("unknown-model")).toBe("claude-3.5-sonnet");
  });
});

describe("calculateTokenCost", () => {
  it("should calculate cost for input tokens only", () => {
    const usage: TokenUsage = {
      input_tokens: 1000,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };

    const result = calculateTokenCost(usage, "claude-3.5-sonnet");

    expect(result.totalUsd).toBe(0.003); // 1000 / 1_000_000 * 3.0
    expect(result.breakdown.inputTokensUsd).toBe(0.003);
    expect(result.breakdown.outputTokensUsd).toBe(0);
    expect(result.breakdown.cacheCreationUsd).toBe(0);
    expect(result.breakdown.cacheReadUsd).toBe(0);
    expect(result.tokenUsage.inputTokens).toBe(1000);
    expect(result.tokenUsage.outputTokens).toBe(0);
    expect(result.tokenUsage.cacheCreationTokens).toBe(0);
    expect(result.tokenUsage.cacheReadTokens).toBe(0);
  });

  it("should calculate cost for output tokens only", () => {
    const usage: TokenUsage = {
      input_tokens: 0,
      output_tokens: 1000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };

    const result = calculateTokenCost(usage, "claude-3.5-sonnet");

    expect(result.totalUsd).toBe(0.015); // 1000 / 1_000_000 * 15.0
    expect(result.breakdown.outputTokensUsd).toBe(0.015);
  });

  it("should calculate cost for all token types", () => {
    const usage: TokenUsage = {
      input_tokens: 10000,
      output_tokens: 5000,
      cache_creation_input_tokens: 2000,
      cache_read_input_tokens: 3000,
    };

    const result = calculateTokenCost(usage, "claude-3.5-sonnet");

    // input: 10000 / 1_000_000 * 3.0 = 0.03
    // output: 5000 / 1_000_000 * 15.0 = 0.075
    // cache_creation: 2000 / 1_000_000 * 3.75 = 0.0075
    // cache_read: 3000 / 1_000_000 * 0.3 = 0.0009
    // total: 0.03 + 0.075 + 0.0075 + 0.0009 = 0.1134
    expect(result.totalUsd).toBeCloseTo(0.1134, 4);
    expect(result.breakdown.inputTokensUsd).toBeCloseTo(0.03, 4);
    expect(result.breakdown.outputTokensUsd).toBeCloseTo(0.075, 4);
    expect(result.breakdown.cacheCreationUsd).toBeCloseTo(0.0075, 4);
    expect(result.breakdown.cacheReadUsd).toBeCloseTo(0.0009, 4);
  });

  it("should calculate cost for Claude 3 Opus", () => {
    const usage: TokenUsage = {
      input_tokens: 1000,
      output_tokens: 1000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };

    const result = calculateTokenCost(usage, "claude-3-opus");

    // input: 1000 / 1_000_000 * 15.0 = 0.015
    // output: 1000 / 1_000_000 * 75.0 = 0.075
    // total: 0.09
    expect(result.totalUsd).toBeCloseTo(0.09, 4);
    expect(result.breakdown.inputTokensUsd).toBeCloseTo(0.015, 4);
    expect(result.breakdown.outputTokensUsd).toBeCloseTo(0.075, 4);
  });

  it("should calculate cost for Claude 3 Haiku", () => {
    const usage: TokenUsage = {
      input_tokens: 100000,
      output_tokens: 50000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };

    const result = calculateTokenCost(usage, "claude-3-haiku");

    // input: 100000 / 1_000_000 * 0.25 = 0.025
    // output: 50000 / 1_000_000 * 1.25 = 0.0625
    // total: 0.0875
    expect(result.totalUsd).toBeCloseTo(0.0875, 4);
    expect(result.breakdown.inputTokensUsd).toBeCloseTo(0.025, 4);
    expect(result.breakdown.outputTokensUsd).toBeCloseTo(0.0625, 4);
  });

  it("should calculate cost for Claude Opus 4.1", () => {
    const usage: TokenUsage = {
      input_tokens: 1000,
      output_tokens: 1000,
      cache_creation_input_tokens: 500,
      cache_read_input_tokens: 500,
    };

    const result = calculateTokenCost(usage, "claude-opus-4.1");

    // input: 1000 / 1_000_000 * 15.0 = 0.015
    // output: 1000 / 1_000_000 * 75.0 = 0.075
    // cache_creation: 500 / 1_000_000 * 18.75 = 0.009375
    // cache_read: 500 / 1_000_000 * 1.5 = 0.00075
    // total: 0.015 + 0.075 + 0.009375 + 0.00075 = 0.100125
    expect(result.totalUsd).toBeCloseTo(0.100125, 4);
    expect(result.breakdown.inputTokensUsd).toBeCloseTo(0.015, 4);
    expect(result.breakdown.outputTokensUsd).toBeCloseTo(0.075, 4);
    expect(result.breakdown.cacheCreationUsd).toBeCloseTo(0.009375, 4);
    expect(result.breakdown.cacheReadUsd).toBeCloseTo(0.00075, 4);
  });

  it("should calculate cost for Claude Opus 4.5", () => {
    const usage: TokenUsage = {
      input_tokens: 1000,
      output_tokens: 1000,
      cache_creation_input_tokens: 500,
      cache_read_input_tokens: 500,
    };

    const result = calculateTokenCost(usage, "claude-opus-4.5");

    // input: 1000 / 1_000_000 * 5.0 = 0.005
    // output: 1000 / 1_000_000 * 25.0 = 0.025
    // cache_creation: 500 / 1_000_000 * 6.25 = 0.003125
    // cache_read: 500 / 1_000_000 * 0.5 = 0.00025
    // total: 0.005 + 0.025 + 0.003125 + 0.00025 = 0.033375
    expect(result.totalUsd).toBeCloseTo(0.033375, 4);
    expect(result.breakdown.inputTokensUsd).toBeCloseTo(0.005, 4);
    expect(result.breakdown.outputTokensUsd).toBeCloseTo(0.025, 4);
    expect(result.breakdown.cacheCreationUsd).toBeCloseTo(0.003125, 4);
    expect(result.breakdown.cacheReadUsd).toBeCloseTo(0.00025, 4);
  });

  it("should calculate cost for Claude Sonnet 4.5", () => {
    const usage: TokenUsage = {
      input_tokens: 1000,
      output_tokens: 1000,
      cache_creation_input_tokens: 500,
      cache_read_input_tokens: 500,
    };

    const result = calculateTokenCost(usage, "claude-sonnet-4.5");

    // input: 1000 / 1_000_000 * 3.0 = 0.003
    // output: 1000 / 1_000_000 * 15.0 = 0.015
    // cache_creation: 500 / 1_000_000 * 3.75 = 0.001875
    // cache_read: 500 / 1_000_000 * 0.3 = 0.00015
    // total: 0.003 + 0.015 + 0.001875 + 0.00015 = 0.020025
    expect(result.totalUsd).toBeCloseTo(0.020025, 4);
    expect(result.breakdown.inputTokensUsd).toBeCloseTo(0.003, 4);
    expect(result.breakdown.outputTokensUsd).toBeCloseTo(0.015, 4);
    expect(result.breakdown.cacheCreationUsd).toBeCloseTo(0.001875, 4);
    expect(result.breakdown.cacheReadUsd).toBeCloseTo(0.00015, 4);
  });

  it("should calculate cost for Claude Haiku 4.5", () => {
    const usage: TokenUsage = {
      input_tokens: 100000,
      output_tokens: 50000,
      cache_creation_input_tokens: 10000,
      cache_read_input_tokens: 5000,
    };

    const result = calculateTokenCost(usage, "claude-haiku-4.5");

    // input: 100000 / 1_000_000 * 1.0 = 0.1
    // output: 50000 / 1_000_000 * 5.0 = 0.25
    // cache_creation: 10000 / 1_000_000 * 1.25 = 0.0125
    // cache_read: 5000 / 1_000_000 * 0.1 = 0.0005
    // total: 0.1 + 0.25 + 0.0125 + 0.0005 = 0.363
    expect(result.totalUsd).toBeCloseTo(0.363, 4);
    expect(result.breakdown.inputTokensUsd).toBeCloseTo(0.1, 4);
    expect(result.breakdown.outputTokensUsd).toBeCloseTo(0.25, 4);
    expect(result.breakdown.cacheCreationUsd).toBeCloseTo(0.0125, 4);
    expect(result.breakdown.cacheReadUsd).toBeCloseTo(0.0005, 4);
  });

  it("should handle optional cache tokens (undefined)", () => {
    const usage: TokenUsage = {
      input_tokens: 1000,
      output_tokens: 1000,
      cache_creation_input_tokens: undefined,
      cache_read_input_tokens: undefined,
    };

    const result = calculateTokenCost(usage, "claude-3.5-sonnet");

    expect(result.totalUsd).toBeCloseTo(0.018, 4); // 0.003 + 0.015
    expect(result.breakdown.cacheCreationUsd).toBe(0);
    expect(result.breakdown.cacheReadUsd).toBe(0);
    expect(result.tokenUsage.cacheCreationTokens).toBe(0);
    expect(result.tokenUsage.cacheReadTokens).toBe(0);
  });

  it("should handle zero tokens", () => {
    const usage: TokenUsage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };

    const result = calculateTokenCost(usage, "claude-3.5-sonnet");

    expect(result.totalUsd).toBe(0);
    expect(result.breakdown.inputTokensUsd).toBe(0);
    expect(result.breakdown.outputTokensUsd).toBe(0);
    expect(result.breakdown.cacheCreationUsd).toBe(0);
    expect(result.breakdown.cacheReadUsd).toBe(0);
  });

  it("should use default pricing for unknown model", () => {
    const usage: TokenUsage = {
      input_tokens: 1000,
      output_tokens: 1000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };

    const result = calculateTokenCost(usage, "unknown-model-xyz");

    // Should use Claude 3.5 Sonnet pricing as default
    expect(result.totalUsd).toBeCloseTo(0.018, 4);
  });

  it("should handle very large token counts", () => {
    const usage: TokenUsage = {
      input_tokens: 10_000_000, // 10M tokens
      output_tokens: 5_000_000, // 5M tokens
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };

    const result = calculateTokenCost(usage, "claude-3.5-sonnet");

    // input: 10_000_000 / 1_000_000 * 3.0 = 30.0
    // output: 5_000_000 / 1_000_000 * 15.0 = 75.0
    // total: 105.0
    expect(result.totalUsd).toBeCloseTo(105.0, 2);
    expect(result.breakdown.inputTokensUsd).toBeCloseTo(30.0, 2);
    expect(result.breakdown.outputTokensUsd).toBeCloseTo(75.0, 2);
  });

  it("should handle fractional token values correctly", () => {
    const usage: TokenUsage = {
      input_tokens: 1,
      output_tokens: 1,
      cache_creation_input_tokens: 1,
      cache_read_input_tokens: 1,
    };

    const result = calculateTokenCost(usage, "claude-3.5-sonnet");

    // Extremely small values but should be calculated correctly
    expect(result.totalUsd).toBeGreaterThan(0);
    expect(result.breakdown.inputTokensUsd).toBeGreaterThan(0);
    expect(result.breakdown.outputTokensUsd).toBeGreaterThan(0);
    expect(result.breakdown.cacheCreationUsd).toBeGreaterThan(0);
    expect(result.breakdown.cacheReadUsd).toBeGreaterThan(0);
  });
});
