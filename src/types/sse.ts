import type { PermissionRequest } from "./permissions";
import type { PublicSessionProcess } from "./session-process";

export type ActivityEntrySSE = {
  id: string;
  projectId: string;
  sessionId: string;
  entryType: "user" | "assistant" | "system" | "tool" | "unknown";
  preview: string;
  timestamp: string;
};

export type SSEEventDeclaration = {
  // biome-ignore lint/complexity/noBannedTypes: correct type
  connect: {};

  // biome-ignore lint/complexity/noBannedTypes: correct type
  heartbeat: {};

  sessionListChanged: {
    projectId: string;
  };

  sessionChanged: {
    projectId: string;
    sessionId: string;
  };

  agentSessionChanged: {
    projectId: string;
    agentSessionId: string;
  };

  sessionProcessChanged: {
    processes: PublicSessionProcess[];
  };

  permissionRequested: {
    permissionRequest: PermissionRequest;
  };

  activityEntry: {
    entry: ActivityEntrySSE;
  };
};

export type SSEEventMap = {
  [K in keyof SSEEventDeclaration]: SSEEventDeclaration[K] & {
    kind: K;
    timestamp: string;
  };
};

export type SSEEvent = SSEEventMap[keyof SSEEventDeclaration];
