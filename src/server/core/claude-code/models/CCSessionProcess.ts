import type { UserMessageInput } from "../functions/createMessageGenerator";
import type { InitMessageContext } from "../types";
import type * as CCTurn from "./ClaudeCodeTurn";

export type CCSessionProcessDef = {
  sessionProcessId: string;
  projectId: string;
  cwd: string;
  abortController: AbortController;
  setNextMessage: (input: UserMessageInput) => void;
};

type CCSessionProcessStateBase = {
  def: CCSessionProcessDef;
  tasks: CCTurn.ClaudeCodeTurnState[];
};

export type CCSessionProcessStartingState = CCSessionProcessStateBase & {
  type: "starting" /* SDK process started, waiting for init message */;
  sessionId: string;
  currentTask: CCTurn.RunningClaudeCodeTurnState;
  rawUserMessage: string;
};

export type CCSessionProcessInitializedState = CCSessionProcessStateBase & {
  type: "initialized" /* init message received */;
  sessionId: string;
  currentTask: CCTurn.RunningClaudeCodeTurnState;
  rawUserMessage: string;
  initContext: InitMessageContext;
};

export type CCSessionProcessFileCreatedState = CCSessionProcessStateBase & {
  type: "file_created" /* file has been created */;
  sessionId: string;
  currentTask: CCTurn.RunningClaudeCodeTurnState;
  rawUserMessage: string;
  initContext: InitMessageContext;
};

export type CCSessionProcessPausedState = CCSessionProcessStateBase & {
  type: "paused" /* task completed, ready for next task */;
  sessionId: string;
};

export type CCSessionProcessCompletedState = CCSessionProcessStateBase & {
  type: "completed" /* paused or running task was aborted. Cannot resume */;
  sessionId: string;
};

export type CCSessionProcessStatePublic =
  | CCSessionProcessStartingState
  | CCSessionProcessInitializedState
  | CCSessionProcessFileCreatedState
  | CCSessionProcessPausedState;

export type CCSessionProcessState =
  | CCSessionProcessStatePublic
  | CCSessionProcessCompletedState;

export const isPublic = (
  process: CCSessionProcessState,
): process is CCSessionProcessStatePublic => {
  return (
    process.type === "starting" ||
    process.type === "initialized" ||
    process.type === "file_created" ||
    process.type === "paused"
  );
};

export const getAliveTasks = (
  process: CCSessionProcessState,
): CCTurn.AliveClaudeCodeTurnState[] => {
  return process.tasks.filter(
    (task) => task.status === "pending" || task.status === "running",
  );
};
