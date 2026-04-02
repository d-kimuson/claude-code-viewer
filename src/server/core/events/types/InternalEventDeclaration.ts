import type { SessionNotification } from "../../../../types/notification.ts";
import type { PermissionRequest } from "../../../../types/permissions.ts";
import type { QuestionRequest } from "../../../../types/question.ts";
import type { PublicSessionProcess } from "../../../../types/session-process.ts";
import type * as CCSessionProcess from "../../claude-code/models/CCSessionProcess.ts";

export type InternalEventDeclaration = {
  // biome-ignore lint/complexity/noBannedTypes: correct type
  heartbeat: Record<string, never>;

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

  questionRequested: {
    questionRequest: QuestionRequest;
  };

  permissionResolved: {
    sessionId: string;
  };

  questionResolved: {
    sessionId: string;
  };

  notificationCreated: {
    notification: SessionNotification;
  };

  notificationConsumed: {
    sessionId: string;
  };

  // biome-ignore lint/complexity/noBannedTypes: correct type
  schedulerJobsChanged: Record<string, never>;
};
