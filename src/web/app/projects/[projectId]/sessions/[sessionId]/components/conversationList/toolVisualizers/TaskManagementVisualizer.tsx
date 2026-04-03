import { CheckCircle2Icon, CircleDotIcon, CircleIcon, ListTodoIcon } from "lucide-react";
import type { FC } from "react";
import { z } from "zod";
import { taskCreateInputSchema, taskUpdateInputSchema, type TaskItem } from "@/lib/task-viewer";
import { useTaskStateSnapshot } from "@/web/contexts/TaskStateContext";
import { cn } from "@/web/utils";
import { ToolResultStatusBanner } from "./ToolResultStatusBanner";
import type { ToolVisualizerProps } from "./types";

const taskUpdateResultSchema = z.object({
  statusChange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
});

const TaskStatusIcon: FC<{ status: TaskItem["status"] }> = ({ status }) => {
  switch (status) {
    case "completed":
      return (
        <CheckCircle2Icon className="w-3.5 h-3.5 flex-shrink-0 text-green-600 dark:text-green-500" />
      );
    case "in_progress":
      return (
        <CircleDotIcon className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
      );
    case "pending":
      return <CircleIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />;
    default:
      status satisfies never;
      return null;
  }
};

const HeaderInfo: FC<{ input: unknown; toolUseResult: unknown }> = ({ input, toolUseResult }) => {
  const createParsed = taskCreateInputSchema.safeParse(input);
  if (createParsed.success) {
    return (
      <span className="text-xs font-medium text-muted-foreground truncate">
        New Task: {createParsed.data.subject}
      </span>
    );
  }

  const updateParsed = taskUpdateInputSchema.safeParse(input);
  const resultParsed = taskUpdateResultSchema.safeParse(toolUseResult);
  if (updateParsed.success) {
    const statusChange = resultParsed.success ? resultParsed.data.statusChange : undefined;

    if (statusChange !== undefined) {
      return (
        <span className="text-xs font-medium text-muted-foreground truncate">
          Task #{updateParsed.data.taskId}: {statusChange.from} &rarr; {statusChange.to}
        </span>
      );
    }

    return (
      <span className="text-xs font-medium text-muted-foreground truncate">
        Task #{updateParsed.data.taskId}
      </span>
    );
  }

  return <span className="text-xs font-medium text-muted-foreground">Tasks</span>;
};

export const TaskManagementVisualizer: FC<ToolVisualizerProps> = ({
  toolUseId,
  input,
  output,
  toolUseResult,
}) => {
  const tasks = useTaskStateSnapshot(toolUseId);

  if (tasks === undefined || tasks.length === 0) return null;

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.length;
  const hasInProgress = tasks.some((t) => t.status === "in_progress");

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <ListTodoIcon
          className={cn(
            "w-3.5 h-3.5",
            hasInProgress ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground",
          )}
        />
        <HeaderInfo input={input} toolUseResult={toolUseResult} />
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full ml-auto",
            completedCount === totalCount
              ? "bg-green-500/20 text-green-700 dark:text-green-400"
              : hasInProgress
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Task list */}
      <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={`${task.id}-${task.status}`}
            className={cn(
              "flex items-start gap-2 px-2 py-1.5 text-xs rounded-md transition-colors",
              task.status === "completed" && "text-muted-foreground",
              task.status === "in_progress" && "bg-amber-500/10",
            )}
          >
            <TaskStatusIcon status={task.status} />
            <span
              className={cn("flex-1 break-words", task.status === "completed" && "line-through")}
            >
              {task.subject}
            </span>
            <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">#{task.id}</span>
          </div>
        ))}
      </div>

      {/* Result status */}
      <ToolResultStatusBanner output={output} />
    </div>
  );
};
