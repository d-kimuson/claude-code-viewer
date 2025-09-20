import type { AliveClaudeCodeTask } from "../claude-code/types";

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

  taskChanged: {
    aliveTasks: AliveClaudeCodeTask[];
    changed: AliveClaudeCodeTask;
  };
};
