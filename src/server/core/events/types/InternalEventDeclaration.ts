import type { PermissionRequest } from "../../../../types/permissions";
import type { PublicSessionProcess } from "../../../../types/session-process";
import type * as CCSessionProcess from "../../claude-code/models/CCSessionProcess";

export type InternalEventDeclaration = {
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
    changed: CCSessionProcess.CCSessionProcessState;
  };

  permissionRequested: {
    permissionRequest: PermissionRequest;
  };
};
