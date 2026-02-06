import { Trans } from "@lingui/react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDotIcon,
  CircleIcon,
  ListTodoIcon,
} from "lucide-react";
import type { FC } from "react";
import { useRightPanel } from "@/hooks/useRightPanel";
import type { TodoItem } from "@/lib/todo-viewer";
import { cn } from "@/lib/utils";

interface CollapsibleTodoSectionProps {
  todos: readonly TodoItem[] | null;
}

const TodoStatusIcon: FC<{ status: TodoItem["status"] }> = ({ status }) => {
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
      return (
        <CircleIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
      );
  }
};

export const CollapsibleTodoSection: FC<CollapsibleTodoSectionProps> = ({
  todos,
}) => {
  const { isTodoSectionOpen: isOpen, setIsTodoSectionOpen: setIsOpen } =
    useRightPanel();

  // Don't render if no todos
  if (!todos || todos.length === 0) {
    return null;
  }

  const completedCount = todos.filter((t) => t.status === "completed").length;
  const totalCount = todos.length;
  const hasInProgress = todos.some((t) => t.status === "in_progress");

  return (
    <div className="border-t border-border/40 bg-muted/5">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
          "hover:bg-muted/30",
          hasInProgress && !isOpen && "bg-amber-500/5",
        )}
      >
        {isOpen ? (
          <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <ListTodoIcon
          className={cn(
            "w-3.5 h-3.5",
            hasInProgress
              ? "text-amber-600 dark:text-amber-500"
              : "text-muted-foreground",
          )}
        />
        <span
          className={cn(
            "flex-1 text-left",
            hasInProgress
              ? "text-amber-700 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        >
          <Trans id="panel.todo.collapsed_title" />
        </span>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full",
            completedCount === totalCount
              ? "bg-green-500/20 text-green-700 dark:text-green-400"
              : hasInProgress
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {completedCount}/{totalCount}
        </span>
      </button>

      {/* Content - collapsible */}
      {isOpen && (
        <div className="p-2 space-y-1 max-h-48 overflow-y-auto border-t border-border/40">
          {todos.map((todo, index) => (
            <div
              key={`${todo.content}-${index}`}
              className={cn(
                "flex items-start gap-2 px-2 py-1.5 text-xs rounded-md transition-colors",
                todo.status === "completed" && "text-muted-foreground",
                todo.status === "in_progress" && "bg-amber-500/10",
              )}
            >
              <TodoStatusIcon status={todo.status} />
              <span
                className={cn(
                  "flex-1 break-words",
                  todo.status === "completed" && "line-through",
                )}
              >
                {todo.content}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
