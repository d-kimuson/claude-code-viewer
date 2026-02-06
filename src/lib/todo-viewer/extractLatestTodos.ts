import type { Conversation } from "../conversation-schema";

export type TodoItem = {
  readonly content: string;
  readonly status: "pending" | "in_progress" | "completed";
};

type ErrorJsonl = {
  type: "x-error";
  line: string;
  lineNumber: number;
};

type ExtendedConversation = Conversation | ErrorJsonl;

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
      typeof todo.content === "string" &&
      "status" in todo &&
      (todo.status === "pending" ||
        todo.status === "in_progress" ||
        todo.status === "completed"),
  );
};

/**
 * Extracts the latest TodoWrite result from a session's conversations
 *
 * @param conversations - Array of conversation entries from a session
 * @returns The latest todo items, or null if no TodoWrite has been used
 */
export const extractLatestTodos = (
  conversations: readonly ExtendedConversation[],
): readonly TodoItem[] | null => {
  let latestTodos: readonly TodoItem[] | null = null;

  for (const conversation of conversations) {
    if (conversation.type === "x-error" || conversation.type !== "assistant") {
      continue;
    }

    const content = conversation.message.content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const item of content) {
      if (typeof item === "string" || item.type !== "tool_use") {
        continue;
      }

      if (item.name === "TodoWrite" && isTodoWriteInput(item.input)) {
        latestTodos = item.input.todos;
      }
    }
  }

  return latestTodos;
};
