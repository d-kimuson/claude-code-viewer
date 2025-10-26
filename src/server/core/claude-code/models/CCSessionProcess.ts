import { Effect } from "effect";
import type { UserEntry } from "../../../../lib/conversation-schema/entry/UserEntrySchema";
import type { UserMessageInput } from "../functions/createMessageGenerator";
import type { InitMessageContext } from "../types";
import * as ClaudeCode from "./ClaudeCode";
import type * as CCTask from "./ClaudeCodeTask";
import * as ClaudeCodeVersion from "./ClaudeCodeVersion";

export type CCSessionProcessDef = {
  sessionProcessId: string;
  projectId: string;
  cwd: string;
  abortController: AbortController;
  setNextMessage: (input: UserMessageInput) => void;
};

type CCSessionProcessStateBase = {
  def: CCSessionProcessDef;
  tasks: CCTask.ClaudeCodeTaskState[];
};

export type CCSessionProcessPendingState = CCSessionProcessStateBase & {
  type: "pending" /* メッセージがまだ解決されていない状態 */;
  sessionId?: undefined;
  currentTask: CCTask.PendingClaudeCodeTaskState;
};

export type CCSessionProcessNotInitializedState = CCSessionProcessStateBase & {
  type: "not_initialized" /* メッセージは解決されているが、init メッセージを未受信 */;
  sessionId?: undefined;
  currentTask: CCTask.RunningClaudeCodeTaskState;
  rawUserMessage: string;
};

export type CCSessionProcessInitializedState = CCSessionProcessStateBase & {
  type: "initialized" /* init メッセージを受信した状態 */;
  sessionId: string;
  currentTask: CCTask.RunningClaudeCodeTaskState;
  rawUserMessage: string;
  initContext: InitMessageContext;
};

export type CCSessionProcessFileCreatedState = CCSessionProcessStateBase & {
  type: "file_created" /* ファイルが作成された状態 */;
  sessionId: string;
  currentTask: CCTask.RunningClaudeCodeTaskState;
  rawUserMessage: string;
  initContext: InitMessageContext;
};

export type CCSessionProcessPausedState = CCSessionProcessStateBase & {
  type: "paused" /* タスクが完了し、次のタスクを受け付け可能 */;
  sessionId: string;
};

export type CCSessionProcessCompletedState = CCSessionProcessStateBase & {
  type: "completed" /* paused あるいは起動中のタスクが中断された状態。再開不可 */;
  sessionId?: string | undefined;
};

export type CCSessionProcessStatePublic =
  | CCSessionProcessInitializedState
  | CCSessionProcessFileCreatedState
  | CCSessionProcessPausedState;

export type CCSessionProcessState =
  | CCSessionProcessPendingState
  | CCSessionProcessNotInitializedState
  | CCSessionProcessStatePublic
  | CCSessionProcessCompletedState;

export const isPublic = (
  process: CCSessionProcessState,
): process is CCSessionProcessStatePublic => {
  return (
    process.type === "initialized" ||
    process.type === "file_created" ||
    process.type === "paused"
  );
};

export const getAliveTasks = (
  process: CCSessionProcessState,
): CCTask.AliveClaudeCodeTaskState[] => {
  return process.tasks.filter(
    (task) => task.status === "pending" || task.status === "running",
  );
};

export const createVirtualConversation = (
  process: CCSessionProcessState,
  ctx: {
    sessionId: string;
    userMessage: string;
  },
) => {
  const timestamp = new Date().toISOString();

  return Effect.gen(function* () {
    const config = yield* ClaudeCode.Config;

    const virtualConversation: UserEntry = {
      type: "user",
      message: {
        role: "user",
        content: ctx.userMessage,
      },
      isSidechain: false,
      userType: "external",
      cwd: process.def.cwd,
      sessionId: ctx.sessionId,
      version: config.claudeCodeVersion
        ? ClaudeCodeVersion.versionText(config.claudeCodeVersion)
        : "unknown",
      uuid: `vc__${ctx.sessionId}__${timestamp}`,
      timestamp,
      parentUuid: null,
    };

    return virtualConversation;
  });
};
