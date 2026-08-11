import type { PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import { describe, expect, it } from "vitest";
import { getPermissionModeFallback } from "./getPermissionModeFallback.ts";

const promptModes: ReadonlyArray<PermissionMode> = ["default", "acceptEdits"];
const denyModes: ReadonlyArray<PermissionMode> = ["dontAsk", "plan"];

describe("getPermissionModeFallback", () => {
  it("allows all tools only in bypassPermissions mode", () => {
    expect(getPermissionModeFallback("bypassPermissions")).toBe("allow");
  });

  it.each(promptModes)("prompts for unresolved tools in %s mode", (mode) => {
    expect(getPermissionModeFallback(mode)).toBe("prompt");
  });

  it.each(denyModes)("denies unresolved tools in %s mode", (mode) => {
    expect(getPermissionModeFallback(mode)).toBe("deny");
  });
});
