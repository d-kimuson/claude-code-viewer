import type { Conversation } from "../conversation-schema";
import { extractEditedFilePaths } from "./extractEditedFilePaths";

export type EditedFileInfo = {
  readonly filePath: string;
  readonly toolName: string;
  readonly toolUseId: string;
  readonly timestamp: string;
};

type ErrorJsonl = {
  type: "x-error";
  line: string;
  lineNumber: number;
};

type ExtendedConversation = Conversation | ErrorJsonl;

/**
 * Extracts all edited files from a session's conversations
 *
 * @param conversations - Array of conversation entries from a session (may include ErrorJsonl)
 * @returns Array of EditedFileInfo with unique file paths (latest occurrence kept)
 */
export const extractAllEditedFiles = (
  conversations: readonly ExtendedConversation[],
): readonly EditedFileInfo[] => {
  const fileMap = new Map<string, EditedFileInfo>();

  for (const conversation of conversations) {
    // Skip error entries and non-assistant messages
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

      const filePaths = extractEditedFilePaths(item);
      for (const filePath of filePaths) {
        fileMap.set(filePath, {
          filePath,
          toolName: item.name,
          toolUseId: item.id,
          timestamp: conversation.timestamp,
        });
      }
    }
  }

  return Array.from(fileMap.values());
};
