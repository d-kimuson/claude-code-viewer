export type PermissionRequest = {
  id: string;
  turnId: string;
  projectId: string;
  sessionId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  timestamp: number;
};

export type PermissionResponse = {
  permissionRequestId: string;
  decision: "allow" | "deny" | "always_allow";
  alwaysAllowRule?: string;
  alwaysAllowScope?: "session" | "project";
};
