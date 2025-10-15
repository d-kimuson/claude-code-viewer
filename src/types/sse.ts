import type { PermissionRequest } from "./permissions";
import type { PublicSessionProcess } from "./session-process";

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

  sessionProcessChanged: {
    processes: PublicSessionProcess[];
  };

  permission_requested: {
    permissionRequest: PermissionRequest;
  };
};

export type SSEEventMap = {
  [K in keyof SSEEventDeclaration]: SSEEventDeclaration[K] & {
    kind: K;
    timestamp: string;
  };
};

export type SSEEvent = SSEEventMap[keyof SSEEventDeclaration];
