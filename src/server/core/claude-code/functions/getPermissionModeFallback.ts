import type { PermissionMode } from "@anthropic-ai/claude-agent-sdk";

export const getPermissionModeFallback = (permissionMode: PermissionMode) => {
  if (permissionMode === "bypassPermissions") {
    return "allow";
  }
  if (permissionMode === "dontAsk" || permissionMode === "plan") {
    return "deny";
  }
  return "prompt";
};
