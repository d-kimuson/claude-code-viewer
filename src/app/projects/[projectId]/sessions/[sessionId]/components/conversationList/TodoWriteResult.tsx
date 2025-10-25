"use client";

import { Trans } from "@lingui/react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TodoItem } from "@/lib/conversation-schema/toolUseResult/TodoWriteToolResultSchema";
import { TodoWriteToolResultSchema } from "@/lib/conversation-schema/toolUseResult/TodoWriteToolResultSchema";

const TodoCheckbox: FC<{ todo: TodoItem }> = ({ todo }) => {
  const Icon =
    todo.status === "completed"
      ? CheckCircle2
      : todo.status === "in_progress"
        ? Loader2
        : Circle;

  const iconClassName =
    todo.status === "completed"
      ? "h-4 w-4 text-green-600 dark:text-green-400"
      : todo.status === "in_progress"
        ? "h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin"
        : "h-4 w-4 text-muted-foreground";

  const textClassName =
    todo.status === "completed"
      ? "line-through text-muted-foreground"
      : todo.status === "in_progress"
        ? "font-medium text-blue-600 dark:text-blue-400"
        : "text-foreground";

  return (
    <div className="flex items-start gap-2 py-1">
      <Icon className={iconClassName} />
      <span className={`text-sm ${textClassName}`}>{todo.content}</span>
    </div>
  );
};

export const TodoWriteResult: FC<{ toolResult: unknown }> = ({
  toolResult,
}) => {
  const parsed = TodoWriteToolResultSchema.safeParse(toolResult);

  if (!parsed.success) {
    return null;
  }

  const { newTodos } = parsed.data;

  if (newTodos.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20 mb-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <Trans id="assistant.tool.todo_list" message="Todo List" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {newTodos.map((todo, index) => (
          <TodoCheckbox key={`${todo.content}-${index}`} todo={todo} />
        ))}
      </CardContent>
    </Card>
  );
};
