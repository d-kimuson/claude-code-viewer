import { createContext, useContext, type FC, type PropsWithChildren, useMemo } from "react";
import { type TaskItem, type TaskStates, computeTaskStates } from "@/lib/task-viewer";
import type { ExtendedConversation } from "@/types/conversation";

type TaskStateContextValue = TaskStates;

const TaskStateContext = createContext<TaskStateContextValue>({
  stateByToolUseId: new Map(),
  latestTasks: null,
});

type TaskStateProviderProps = {
  conversations: readonly ExtendedConversation[];
};

export const TaskStateProvider: FC<PropsWithChildren<TaskStateProviderProps>> = ({
  conversations,
  children,
}) => {
  const taskStates = useMemo(() => computeTaskStates(conversations), [conversations]);
  return <TaskStateContext.Provider value={taskStates}>{children}</TaskStateContext.Provider>;
};

export const useTaskStateSnapshot = (toolUseId: string): readonly TaskItem[] | undefined => {
  return useContext(TaskStateContext).stateByToolUseId.get(toolUseId);
};

export const useLatestTasks = (): readonly TaskItem[] | null => {
  return useContext(TaskStateContext).latestTasks;
};
