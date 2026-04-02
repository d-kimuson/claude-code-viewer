import { describe, expect, test } from "vitest";
import { AgentSettingEntrySchema } from "./AgentSettingEntrySchema.ts";

describe("AgentSettingEntrySchema", () => {
  test("accepts valid agent-setting entry", () => {
    const result = AgentSettingEntrySchema.safeParse({
      type: "agent-setting",
      agentSetting: "architect",
      sessionId: "7ddc7ebc-a74b-4895-9945-bf0266eae7bf",
    });
    expect(result.success).toBe(true);
    const data = result.success ? result.data : undefined;
    expect(data?.type).toBe("agent-setting");
    expect(data?.agentSetting).toBe("architect");
    expect(data?.sessionId).toBe("7ddc7ebc-a74b-4895-9945-bf0266eae7bf");
  });

  test("rejects missing agentSetting", () => {
    const result = AgentSettingEntrySchema.safeParse({
      type: "agent-setting",
      sessionId: "7ddc7ebc-a74b-4895-9945-bf0266eae7bf",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing sessionId", () => {
    const result = AgentSettingEntrySchema.safeParse({
      type: "agent-setting",
      agentSetting: "architect",
    });
    expect(result.success).toBe(false);
  });

  test("rejects wrong type", () => {
    const result = AgentSettingEntrySchema.safeParse({
      type: "agent-name",
      agentSetting: "architect",
      sessionId: "7ddc7ebc-a74b-4895-9945-bf0266eae7bf",
    });
    expect(result.success).toBe(false);
  });
});
