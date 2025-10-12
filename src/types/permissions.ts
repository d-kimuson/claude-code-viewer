export type PermissionRequest = {
  id: string;
  taskId: string;
  sessionId?: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  timestamp: number;
};

export type PermissionResponse = {
  permissionRequestId: string;
  decision: "allow" | "deny";
};
