import type { Conversation } from "../conversation-schema";

export type ToolCallInfo = {
  readonly id: string;
  readonly name: string;
  readonly timestamp: string;
  readonly inputSummary: string;
};

type ErrorJsonl = {
  type: "x-error";
  line: string;
  lineNumber: number;
};

type ExtendedConversation = Conversation | ErrorJsonl;

const summarizeInput = (input: unknown): string => {
  if (input === null || input === undefined) {
    return "";
  }

  if (typeof input === "string") {
    return input.slice(0, 80);
  }

  if (typeof input !== "object") {
    return String(input).slice(0, 80);
  }

  // For objects, try to extract meaningful summary
  const obj = input as Record<string, unknown>;

  // Common patterns for tool inputs
  if ("file_path" in obj && typeof obj.file_path === "string") {
    return obj.file_path;
  }

  if ("command" in obj && typeof obj.command === "string") {
    return obj.command.slice(0, 80);
  }

  if ("query" in obj && typeof obj.query === "string") {
    return obj.query.slice(0, 80);
  }

  if ("pattern" in obj && typeof obj.pattern === "string") {
    return obj.pattern.slice(0, 80);
  }

  if ("url" in obj && typeof obj.url === "string") {
    return obj.url;
  }

  if ("content" in obj && typeof obj.content === "string") {
    return obj.content.slice(0, 80);
  }

  // Fallback: stringify first few keys
  const keys = Object.keys(obj).slice(0, 3);
  if (keys.length === 0) {
    return "{}";
  }

  return keys.join(", ");
};

/**
 * Extracts all tool calls from a session's conversations
 *
 * @param conversations - Array of conversation entries from a session
 * @returns Array of ToolCallInfo in chronological order
 */
export const extractToolCalls = (
  conversations: readonly ExtendedConversation[],
): readonly ToolCallInfo[] => {
  const toolCalls: ToolCallInfo[] = [];

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

      toolCalls.push({
        id: item.id,
        name: item.name,
        timestamp: conversation.timestamp,
        inputSummary: summarizeInput(item.input),
      });
    }
  }

  return toolCalls;
};
