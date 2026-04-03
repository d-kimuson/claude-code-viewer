import { CheckCircle2Icon, CircleDotIcon, CircleIcon, ListTodoIcon } from "lucide-react";
import type { FC } from "react";
import { z } from "zod";
import { cn } from "@/web/utils";
import { ToolResultStatusBanner } from "./ToolResultStatusBanner";
import type { ToolVisualizerProps } from "./types";

const todoItemSchema = z.object({
  content: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]),
});

const inputSchema = z.object({
  todos: z.array(todoItemSchema),
});

const TodoStatusIcon: FC<{ status: z.infer<typeof todoItemSchema>["status"] }> = ({ status }) => {
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

export const TodoWriteVisualizer: FC<ToolVisualizerProps> = ({ input, output }) => {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  const { todos } = parsedInput.data;
  const completedCount = todos.filter((t) => t.status === "completed").length;
  const totalCount = todos.length;
  const hasInProgress = todos.some((t) => t.status === "in_progress");

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
        <span className="text-xs font-medium text-muted-foreground">Tasks</span>
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

      {/* Todo list */}
      <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
        {todos.map((todo) => (
          <div
            key={`${todo.content}-${todo.status}`}
            className={cn(
              "flex items-start gap-2 px-2 py-1.5 text-xs rounded-md transition-colors",
              todo.status === "completed" && "text-muted-foreground",
              todo.status === "in_progress" && "bg-amber-500/10",
            )}
          >
            <TodoStatusIcon status={todo.status} />
            <span
              className={cn("flex-1 break-words", todo.status === "completed" && "line-through")}
            >
              {todo.content}
            </span>
          </div>
        ))}
      </div>

      {/* Result status */}
      <ToolResultStatusBanner output={output} />
    </div>
  );
};
