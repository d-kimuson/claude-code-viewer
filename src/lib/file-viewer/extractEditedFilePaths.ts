import type { ToolUseContent } from "../conversation-schema/content/ToolUseContentSchema";

/** Tools that create or modify files */
const FILE_EDITING_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

/**
 * Extracts file paths from Write/Edit/MultiEdit tool uses
 *
 * @param toolUse - The tool use content from an assistant message
 * @returns Array of file paths that were edited (empty if not a file-editing tool or path not found)
 */
export const extractEditedFilePaths = (toolUse: ToolUseContent): string[] => {
  // Only process file-editing tools
  if (!FILE_EDITING_TOOLS.has(toolUse.name)) {
    return [];
  }

  const input = toolUse.input;

  // Extract file_path from input
  if (typeof input === "object" && input !== null && "file_path" in input) {
    const filePath = input.file_path;
    if (typeof filePath === "string" && filePath.length > 0) {
      return [filePath];
    }
  }

  return [];
};
