import { describe, expect, test } from "vitest";
import { PermissionModeEntrySchema } from "./PermissionModeEntrySchema.ts";

describe("PermissionModeEntrySchema", () => {
  test("accepts valid permission-mode entry", () => {
    const result = PermissionModeEntrySchema.safeParse({
      type: "permission-mode",
      permissionMode: "bypassPermissions",
      sessionId: "7ddc7ebc-a74b-4895-9945-bf0266eae7bf",
    });
    expect(result.success).toBe(true);
    const data = result.success ? result.data : undefined;
    expect(data?.type).toBe("permission-mode");
    expect(data?.permissionMode).toBe("bypassPermissions");
    expect(data?.sessionId).toBe("7ddc7ebc-a74b-4895-9945-bf0266eae7bf");
  });

  test("rejects missing permissionMode", () => {
    const result = PermissionModeEntrySchema.safeParse({
      type: "permission-mode",
      sessionId: "7ddc7ebc-a74b-4895-9945-bf0266eae7bf",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing sessionId", () => {
    const result = PermissionModeEntrySchema.safeParse({
      type: "permission-mode",
      permissionMode: "bypassPermissions",
    });
    expect(result.success).toBe(false);
  });

  test("rejects wrong type", () => {
    const result = PermissionModeEntrySchema.safeParse({
      type: "agent-setting",
      permissionMode: "bypassPermissions",
      sessionId: "7ddc7ebc-a74b-4895-9945-bf0266eae7bf",
    });
    expect(result.success).toBe(false);
  });
});
