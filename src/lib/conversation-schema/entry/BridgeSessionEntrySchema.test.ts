import { describe, expect, test } from "vitest";
import { BridgeSessionEntrySchema } from "./BridgeSessionEntrySchema.ts";

describe("BridgeSessionEntrySchema", () => {
  test("accepts valid bridge-session entry", () => {
    const result = BridgeSessionEntrySchema.safeParse({
      type: "bridge-session",
      sessionId: "fc90d874-4741-4500-9462-a6255cfff0fe",
      bridgeSessionId: "cse_011C66zkyVAdqvuayh7XGpto",
      lastSequenceNum: 0,
    });
    expect(result.success).toBe(true);
    const data = result.success ? result.data : undefined;
    expect(data?.type).toBe("bridge-session");
    expect(data?.bridgeSessionId).toBe("cse_011C66zkyVAdqvuayh7XGpto");
    expect(data?.lastSequenceNum).toBe(0);
  });

  test("accepts bridge-session entry without lastSequenceNum", () => {
    const result = BridgeSessionEntrySchema.safeParse({
      type: "bridge-session",
      sessionId: "fc90d874-4741-4500-9462-a6255cfff0fe",
      bridgeSessionId: "cse_011C66zkyVAdqvuayh7XGpto",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing bridgeSessionId", () => {
    const result = BridgeSessionEntrySchema.safeParse({
      type: "bridge-session",
      sessionId: "fc90d874-4741-4500-9462-a6255cfff0fe",
    });
    expect(result.success).toBe(false);
  });

  test("rejects wrong type", () => {
    const result = BridgeSessionEntrySchema.safeParse({
      type: "mode",
      sessionId: "fc90d874-4741-4500-9462-a6255cfff0fe",
      bridgeSessionId: "cse_011C66zkyVAdqvuayh7XGpto",
    });
    expect(result.success).toBe(false);
  });
});
