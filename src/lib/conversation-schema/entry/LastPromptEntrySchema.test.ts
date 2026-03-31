import { describe, expect, test } from "vitest";
import { LastPromptEntrySchema } from "./LastPromptEntrySchema";

describe("LastPromptEntrySchema", () => {
  test("accepts valid last-prompt entry", () => {
    const result = LastPromptEntrySchema.safeParse({
      type: "last-prompt",
      lastPrompt: "Read docs/2026-03-12-phase-2-raise-only-hires.md...",
      sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("last-prompt");
      expect(result.data.lastPrompt).toBe(
        "Read docs/2026-03-12-phase-2-raise-only-hires.md...",
      );
      expect(result.data.sessionId).toBe(
        "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
      );
    }
  });

  test("rejects missing lastPrompt", () => {
    const result = LastPromptEntrySchema.safeParse({
      type: "last-prompt",
      sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing sessionId", () => {
    const result = LastPromptEntrySchema.safeParse({
      type: "last-prompt",
      lastPrompt: "Some prompt text",
    });
    expect(result.success).toBe(false);
  });

  test("rejects wrong type literal", () => {
    const result = LastPromptEntrySchema.safeParse({
      type: "not-last-prompt",
      lastPrompt: "Some prompt text",
      sessionId: "abc-123",
    });
    expect(result.success).toBe(false);
  });
});
