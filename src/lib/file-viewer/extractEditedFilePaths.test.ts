import { describe, expect, it } from "vitest";
import type { ToolUseContent } from "../conversation-schema/content/ToolUseContentSchema";
import { extractEditedFilePaths } from "./extractEditedFilePaths";

describe("extractEditedFilePaths", () => {
  describe("Write tool", () => {
    it("should extract file_path from Write tool input", () => {
      const toolUse: ToolUseContent = {
        type: "tool_use",
        id: "tool-1",
        name: "Write",
        input: {
          file_path: "/path/to/file.ts",
          content: "file content",
        },
      };

      const result = extractEditedFilePaths(toolUse);
      expect(result).toEqual(["/path/to/file.ts"]);
    });

    it("should return empty array if file_path is missing", () => {
      const toolUse: ToolUseContent = {
        type: "tool_use",
        id: "tool-1",
        name: "Write",
        input: {
          content: "file content",
        },
      };

      const result = extractEditedFilePaths(toolUse);
      expect(result).toEqual([]);
    });

    it("should return empty array if file_path is not a string", () => {
      const toolUse: ToolUseContent = {
        type: "tool_use",
        id: "tool-1",
        name: "Write",
        input: {
          file_path: 123,
          content: "file content",
        },
      };

      const result = extractEditedFilePaths(toolUse);
      expect(result).toEqual([]);
    });
  });

  describe("Edit tool", () => {
    it("should extract file_path from Edit tool input", () => {
      const toolUse: ToolUseContent = {
        type: "tool_use",
        id: "tool-1",
        name: "Edit",
        input: {
          file_path: "/path/to/edited-file.ts",
          old_string: "old",
          new_string: "new",
        },
      };

      const result = extractEditedFilePaths(toolUse);
      expect(result).toEqual(["/path/to/edited-file.ts"]);
    });

    it("should return empty array if file_path is missing in Edit tool", () => {
      const toolUse: ToolUseContent = {
        type: "tool_use",
        id: "tool-1",
        name: "Edit",
        input: {
          old_string: "old",
          new_string: "new",
        },
      };

      const result = extractEditedFilePaths(toolUse);
      expect(result).toEqual([]);
    });
  });

  describe("MultiEdit tool", () => {
    it("should extract file_path from MultiEdit tool input", () => {
      const toolUse: ToolUseContent = {
        type: "tool_use",
        id: "tool-1",
        name: "MultiEdit",
        input: {
          file_path: "/path/to/multi-edited-file.ts",
          edits: [
            { old_string: "old1", new_string: "new1" },
            { old_string: "old2", new_string: "new2" },
          ],
        },
      };

      const result = extractEditedFilePaths(toolUse);
      expect(result).toEqual(["/path/to/multi-edited-file.ts"]);
    });
  });

  describe("Other tools", () => {
    it("should return empty array for non-file-editing tools", () => {
      const toolUse: ToolUseContent = {
        type: "tool_use",
        id: "tool-1",
        name: "Read",
        input: {
          file_path: "/path/to/file.ts",
        },
      };

      const result = extractEditedFilePaths(toolUse);
      expect(result).toEqual([]);
    });

    it("should return empty array for Bash tool", () => {
      const toolUse: ToolUseContent = {
        type: "tool_use",
        id: "tool-1",
        name: "Bash",
        input: {
          command: "echo hello",
        },
      };

      const result = extractEditedFilePaths(toolUse);
      expect(result).toEqual([]);
    });

    it("should return empty array for Task tool", () => {
      const toolUse: ToolUseContent = {
        type: "tool_use",
        id: "tool-1",
        name: "Task",
        input: {
          prompt: "Do something",
        },
      };

      const result = extractEditedFilePaths(toolUse);
      expect(result).toEqual([]);
    });
  });
});
