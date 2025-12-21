import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import type { ExtendedConversation } from "@/server/core/types";

/**
 * Information about a tool call extracted from conversation entries
 */
export type ToolCallInfo = {
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult: ToolResultContent | undefined;
  conversationIndex: number;
  timestamp: string;
};

/**
 * Filters for tool call list
 */
export type ToolCallFilters = {
  toolTypes: Set<string>; // Empty set means all types
  pathQuery: string; // Case-insensitive substring match
};

/**
 * Extract all tool calls from conversation entries
 */
export const extractToolCalls = (
  conversations: ExtendedConversation[],
  getToolResult: (toolUseId: string) => ToolResultContent | undefined,
): ToolCallInfo[] => {
  const toolCalls: ToolCallInfo[] = [];

  for (const [index, conversation] of conversations.entries()) {
    // Skip error entries
    if (conversation.type === "x-error") {
      continue;
    }

    // Only process assistant entries
    if (conversation.type !== "assistant") {
      continue;
    }

    // Extract tool_use content blocks
    for (const content of conversation.message.content) {
      if (content.type !== "tool_use") {
        continue;
      }

      toolCalls.push({
        toolUseId: content.id,
        toolName: content.name,
        toolInput: content.input,
        toolResult: getToolResult(content.id),
        conversationIndex: index,
        timestamp: conversation.timestamp,
      });
    }
  }

  return toolCalls;
};

/**
 * Extract searchable text from tool input based on tool type
 */
const extractSearchableText = (
  toolName: string,
  toolInput: Record<string, unknown>,
): string => {
  const getText = (value: unknown): string => {
    if (typeof value === "string") {
      return value;
    }
    return "";
  };

  switch (toolName) {
    case "Edit":
    case "Read":
    case "Write":
      // File-based tools: search in file_path
      return getText(toolInput.file_path);

    case "Bash":
      // Bash: search in command
      return getText(toolInput.command);

    case "Glob":
      // Glob: search in pattern and path
      return `${getText(toolInput.pattern)} ${getText(toolInput.path)}`;

    case "Grep":
      // Grep: search in pattern and path
      return `${getText(toolInput.pattern)} ${getText(toolInput.path)}`;

    default:
      // Other tools: no searchable content
      return "";
  }
};

/**
 * Filter tool calls based on tool type and path query
 */
export const filterToolCalls = (
  toolCalls: ToolCallInfo[],
  filters: ToolCallFilters,
): ToolCallInfo[] => {
  const { toolTypes, pathQuery } = filters;

  return toolCalls.filter((toolCall) => {
    // Filter by tool type if specified
    if (toolTypes.size > 0 && !toolTypes.has(toolCall.toolName)) {
      return false;
    }

    // Filter by path query if specified
    if (pathQuery.trim() !== "") {
      const searchableText = extractSearchableText(
        toolCall.toolName,
        toolCall.toolInput,
      );
      const normalizedQuery = pathQuery.toLowerCase();
      const normalizedText = searchableText.toLowerCase();

      if (!normalizedText.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
};
