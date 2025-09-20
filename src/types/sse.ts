import type { AliveClaudeCodeTask } from "../server/service/claude-code/types";

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

  taskChanged: {
    aliveTasks: AliveClaudeCodeTask[];
    changed: AliveClaudeCodeTask;
  };
};

export type SSEEventMap = {
  [K in keyof SSEEventDeclaration]: SSEEventDeclaration[K] & {
    kind: K;
    timestamp: string;
  };
};

export type SSEEvent = SSEEventMap[keyof SSEEventDeclaration];
