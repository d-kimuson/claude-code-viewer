import type { ExtendedConversation } from "../../types/conversation.ts";
import { computeTaskStates, type TaskStates } from "../task-viewer/computeTaskStates.ts";

export type TodoItem = {
  readonly content: string;
  readonly status: "pending" | "in_progress" | "completed";
};

export type TodoState = {
  readonly todoWriteItems: readonly TodoItem[] | null;
  readonly taskItems: readonly TodoItem[] | null;
};

const isTodoWriteInput = (
  input: Record<string, unknown>,
): input is { todos: readonly TodoItem[] } => {
  if (!("todos" in input) || !Array.isArray(input.todos)) {
    return false;
  }
  return input.todos.every(
    (todo): todo is TodoItem =>
      typeof todo === "object" &&
      todo !== null &&
      "content" in todo &&
      // oxlint-disable-next-line no-unsafe-member-access -- Checked via in-operator above
      typeof todo.content === "string" &&
      "status" in todo &&
      // oxlint-disable-next-line no-unsafe-member-access -- Checked via in-operator above
      (todo.status === "pending" || todo.status === "in_progress" || todo.status === "completed"),
  );
};

/**
 * Extracts the latest todo state from both TodoWrite and TaskCreate/TaskUpdate tool calls.
 *
 * @param conversations - Array of conversation entries from a session
 * @returns Object containing both todoWriteItems and taskItems
 */
export const extractLatestTodoState = (
  conversations: readonly ExtendedConversation[],
  precomputedTaskStates?: TaskStates,
): TodoState => {
  let todoWriteItems: readonly TodoItem[] | null = null;

  for (const conversation of conversations) {
    if (conversation.type === "x-error" || conversation.type !== "assistant") {
      continue;
    }

    const content = conversation.message.content;

    for (const item of content) {
      if (typeof item === "string" || item.type !== "tool_use") {
        continue;
      }

      if (item.name === "TodoWrite" && isTodoWriteInput(item.input)) {
        todoWriteItems = item.input.todos;
      }
    }
  }

  const taskStates = precomputedTaskStates ?? computeTaskStates(conversations);
  const taskItems: readonly TodoItem[] | null = taskStates.latestTasks
    ? taskStates.latestTasks.map((task) => ({
        content: task.subject,
        status: task.status,
      }))
    : null;

  return { todoWriteItems, taskItems };
};

/**
 * Extracts the latest TodoWrite result from a session's conversations.
 * Returns combined list from both TodoWrite and TaskCreate/TaskUpdate.
 *
 * @param conversations - Array of conversation entries from a session
 * @returns The latest todo items, or null if no TodoWrite or TaskCreate has been used
 */
export const extractLatestTodos = (
  conversations: readonly ExtendedConversation[],
): readonly TodoItem[] | null => {
  const state = extractLatestTodoState(conversations);

  if (state.todoWriteItems && state.taskItems) {
    return [...state.todoWriteItems, ...state.taskItems];
  }

  return state.todoWriteItems ?? state.taskItems;
};
