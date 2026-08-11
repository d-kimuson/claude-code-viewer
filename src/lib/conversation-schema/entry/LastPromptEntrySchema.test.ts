import { describe, expect, test } from "vitest";
import { LastPromptEntrySchema } from "./LastPromptEntrySchema.ts";

describe("LastPromptEntrySchema", () => {
  test("accepts valid last-prompt entry", () => {
    const result = LastPromptEntrySchema.safeParse({
      type: "last-prompt",
      lastPrompt: "Read docs/2026-03-12-phase-2-raise-only-hires.md...",
      sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
    });
    expect(result.success).toBe(true);
    const data = result.success ? result.data : undefined;
    expect(data?.type).toBe("last-prompt");
    expect(data?.lastPrompt).toBe("Read docs/2026-03-12-phase-2-raise-only-hires.md...");
    expect(data?.sessionId).toBe("28fc793f-fbe6-4062-8b4a-3d6e28f65b8b");
  });

  test("accepts last-prompt entry with leafUuid instead of lastPrompt", () => {
    const result = LastPromptEntrySchema.safeParse({
      type: "last-prompt",
      leafUuid: "02e5eb93-f937-42d7-a944-d1b3eccdd414",
      sessionId: "55aa54f1-c57b-476c-be3a-e9aac3b0aa72",
    });
    expect(result.success).toBe(true);
    const data = result.success ? result.data : undefined;
    expect(data?.leafUuid).toBe("02e5eb93-f937-42d7-a944-d1b3eccdd414");
    expect(data?.lastPrompt).toBeUndefined();
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
