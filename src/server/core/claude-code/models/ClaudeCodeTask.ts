type BaseClaudeCodeTaskDef = {
  taskId: string;
};

export type NewClaudeCodeTaskDef = BaseClaudeCodeTaskDef & {
  type: "new";
  sessionId?: undefined;
  baseSessionId?: undefined;
};

export type ContinueClaudeCodeTaskDef = BaseClaudeCodeTaskDef & {
  type: "continue";
  sessionId: string;
  baseSessionId: string;
};

export type ResumeClaudeCodeTaskDef = BaseClaudeCodeTaskDef & {
  type: "resume";
  sessionId?: undefined;
  baseSessionId: string;
};

export type ClaudeCodeTaskDef =
  | NewClaudeCodeTaskDef
  | ContinueClaudeCodeTaskDef
  | ResumeClaudeCodeTaskDef;

type ClaudeCodeTaskStateBase = {
  def: ClaudeCodeTaskDef;
};

export type PendingClaudeCodeTaskState = ClaudeCodeTaskStateBase & {
  status: "pending";
  sessionId?: undefined;
};

export type RunningClaudeCodeTaskState = ClaudeCodeTaskStateBase & {
  status: "running";
  sessionId?: undefined;
};

export type CompletedClaudeCodeTaskState = ClaudeCodeTaskStateBase & {
  status: "completed";
  sessionId?: string | undefined;
};

export type FailedClaudeCodeTaskState = ClaudeCodeTaskStateBase & {
  status: "failed";
  error: unknown;
};

export type AliveClaudeCodeTaskState =
  | PendingClaudeCodeTaskState
  | RunningClaudeCodeTaskState;

export type ClaudeCodeTaskState =
  | AliveClaudeCodeTaskState
  | CompletedClaudeCodeTaskState
  | FailedClaudeCodeTaskState;
