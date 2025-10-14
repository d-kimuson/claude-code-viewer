import type { MessageGenerator, OnMessage } from "./createMessageGenerator";

type BaseClaudeCodeTask = {
  id: string;
  projectId: string;
  baseSessionId?: string | undefined; // undefined = new session
  cwd: string;
  generateMessages: MessageGenerator;
  setNextMessage: (message: string) => void;
  resolveFirstMessage: () => void;
  setFirstMessagePromise: () => void;
  awaitFirstMessage: () => Promise<void>;
  onMessageHandlers: OnMessage[];
};

export type PendingClaudeCodeTask = BaseClaudeCodeTask & {
  status: "pending";
};

export type RunningClaudeCodeTask = BaseClaudeCodeTask & {
  status: "running";
  sessionId: string;
  userMessageId: string | undefined;
  abortController: AbortController;
};

export type PausedClaudeCodeTask = BaseClaudeCodeTask & {
  status: "paused";
  sessionId: string;
  userMessageId: string | undefined;
  abortController: AbortController;
};

type CompletedClaudeCodeTask = BaseClaudeCodeTask & {
  status: "completed";
  sessionId: string;
  userMessageId: string | undefined;
  abortController: AbortController;
  resolveFirstMessage: () => void;
};

type FailedClaudeCodeTask = BaseClaudeCodeTask & {
  status: "failed";
  sessionId?: string;
  userMessageId?: string;
  abortController?: AbortController;
};

export type ClaudeCodeTask =
  | RunningClaudeCodeTask
  | PausedClaudeCodeTask
  | CompletedClaudeCodeTask
  | FailedClaudeCodeTask;

export type AliveClaudeCodeTask = RunningClaudeCodeTask | PausedClaudeCodeTask;

export type SerializableAliveTask = Pick<
  AliveClaudeCodeTask,
  "id" | "status" | "sessionId"
>;

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
