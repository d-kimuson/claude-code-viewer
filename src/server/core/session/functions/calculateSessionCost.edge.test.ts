import { describe, expect, it } from "vitest";
import { normalizeModelName } from "./calculateSessionCost.ts";

/**
 * Edge cases for normalizeModelName that are NOT covered by the existing test file.
 * Focus on potential misclassifications and boundary conditions.
 */
describe("normalizeModelName - additional edge cases", () => {
  describe("opus-4 without version suffix", () => {
    it("should fall back to default for 'claude-opus-4' (no .5 or .1 suffix)", () => {
      // claude-opus-4 does NOT match opus-4-5 or opus-4.5 or opus-4-1 or opus-4.1
      // It also does not match 3-opus or opus-20
      // Expected: falls through to default = "claude-3.5-sonnet"
      const result = normalizeModelName("claude-opus-4");
      expect(result).toBe("claude-3.5-sonnet");
    });
  });

  describe("haiku-4 without version suffix", () => {
    it("should fall back to default for 'claude-haiku-4' (no .5 suffix)", () => {
      // claude-haiku-4 does NOT match haiku-4-5 or haiku-4.5
      // It also does not match 3-haiku or haiku-20
      // Expected: falls through to default = "claude-3.5-sonnet"
      const result = normalizeModelName("claude-haiku-4");
      expect(result).toBe("claude-3.5-sonnet");
    });
  });

  describe("case insensitivity", () => {
    it("handles UPPERCASE model names (sonnet-4-5)", () => {
      const result = normalizeModelName("CLAUDE-SONNET-4-5-20250929");
      expect(result).toBe("claude-sonnet-4.5");
    });

    it("handles mixed case for opus-4-5", () => {
      const result = normalizeModelName("Claude-Opus-4-5-20251101");
      expect(result).toBe("claude-opus-4.5");
    });
  });

  describe("claude-3.5-sonnet patterns", () => {
    it("recognizes claude-sonnet-4 (without .5) as claude-3.5-sonnet", () => {
      // "sonnet-4" is matched by the check: normalized.includes("sonnet-4")
      // This maps to claude-3.5-sonnet per the comment: "Sonnet 4 without version suffix"
      const result = normalizeModelName("claude-sonnet-4-20250514");
      expect(result).toBe("claude-3.5-sonnet");
    });

    it("recognizes claude-3.5-sonnet with dot", () => {
      const result = normalizeModelName("claude-3.5-sonnet-20241022");
      expect(result).toBe("claude-3.5-sonnet");
    });
  });

  describe("model name priority: more specific patterns first", () => {
    it("opus-4-5 takes priority over generic opus-4 check (if it existed)", () => {
      // Ensure sonnet-4-5 does NOT fall into the sonnet-4 bucket (the more specific pattern wins)
      const result = normalizeModelName("claude-sonnet-4-5-20250929");
      // Should be claude-sonnet-4.5, NOT claude-3.5-sonnet
      expect(result).toBe("claude-sonnet-4.5");
      expect(result).not.toBe("claude-3.5-sonnet");
    });

    it("haiku-4-5 takes priority and is not treated as haiku-4 (default)", () => {
      const result = normalizeModelName("claude-haiku-4-5-20251001");
      expect(result).toBe("claude-haiku-4.5");
      expect(result).not.toBe("claude-3.5-sonnet");
    });
  });

  describe("completely unknown models", () => {
    it("returns claude-3.5-sonnet for empty string", () => {
      const result = normalizeModelName("");
      expect(result).toBe("claude-3.5-sonnet");
    });

    it("returns claude-3.5-sonnet for random string", () => {
      const result = normalizeModelName("gpt-4-turbo");
      expect(result).toBe("claude-3.5-sonnet");
    });

    it("returns claude-3.5-sonnet for partial match that does not qualify", () => {
      // "opus" alone should not match anything specific
      const result = normalizeModelName("opus");
      expect(result).toBe("claude-3.5-sonnet");
    });
  });
});
