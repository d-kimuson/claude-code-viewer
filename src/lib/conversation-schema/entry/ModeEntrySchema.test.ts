import { describe, expect, test } from "vitest";
import { ModeEntrySchema } from "./ModeEntrySchema.ts";

describe("ModeEntrySchema", () => {
  test("accepts valid mode entry", () => {
    const result = ModeEntrySchema.safeParse({
      type: "mode",
      mode: "normal",
      sessionId: "3e3c611b-ebc9-42c2-a98a-344693a9a0d2",
    });
    expect(result.success).toBe(true);
    const data = result.success ? result.data : undefined;
    expect(data?.type).toBe("mode");
    expect(data?.mode).toBe("normal");
    expect(data?.sessionId).toBe("3e3c611b-ebc9-42c2-a98a-344693a9a0d2");
  });

  test("rejects missing mode", () => {
    const result = ModeEntrySchema.safeParse({
      type: "mode",
      sessionId: "3e3c611b-ebc9-42c2-a98a-344693a9a0d2",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing sessionId", () => {
    const result = ModeEntrySchema.safeParse({
      type: "mode",
      mode: "normal",
    });
    expect(result.success).toBe(false);
  });

  test("rejects wrong type", () => {
    const result = ModeEntrySchema.safeParse({
      type: "permission-mode",
      mode: "normal",
      sessionId: "3e3c611b-ebc9-42c2-a98a-344693a9a0d2",
    });
    expect(result.success).toBe(false);
  });
});
