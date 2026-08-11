import { describe, expect, it } from "vitest";
import { parseUserSettingsDefaultPermissionMode } from "./parseUserSettingsDefaultPermissionMode.ts";

describe("parseUserSettingsDefaultPermissionMode", () => {
  it("extracts a supported defaultMode from permissions", () => {
    const content = JSON.stringify({
      permissions: { defaultMode: "bypassPermissions" },
    });

    expect(parseUserSettingsDefaultPermissionMode(content)).toBe("bypassPermissions");
  });

  it("returns undefined when permissions is missing", () => {
    const content = JSON.stringify({ model: "opus" });

    expect(parseUserSettingsDefaultPermissionMode(content)).toBeUndefined();
  });

  it("returns undefined when defaultMode is missing", () => {
    const content = JSON.stringify({ permissions: { allow: ["Bash(*)"] } });

    expect(parseUserSettingsDefaultPermissionMode(content)).toBeUndefined();
  });

  it("extracts dontAsk mode", () => {
    const content = JSON.stringify({ permissions: { defaultMode: "dontAsk" } });

    expect(parseUserSettingsDefaultPermissionMode(content)).toBe("dontAsk");
  });

  it("returns undefined for invalid JSON", () => {
    expect(parseUserSettingsDefaultPermissionMode("{not valid json")).toBeUndefined();
  });

  it("returns undefined when the top-level value is not an object", () => {
    expect(parseUserSettingsDefaultPermissionMode(JSON.stringify(["a", "b"]))).toBeUndefined();
  });

  it("extracts plan mode", () => {
    const content = JSON.stringify({ permissions: { defaultMode: "plan" } });

    expect(parseUserSettingsDefaultPermissionMode(content)).toBe("plan");
  });
});
