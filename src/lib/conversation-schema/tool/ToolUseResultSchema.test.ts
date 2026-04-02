import { describe, expect, test } from "vitest";
import { ToolUseResultSchema } from "./index.ts";

describe("ToolUseResultSchema", () => {
  describe("string result", () => {
    test("accepts plain string", () => {
      const result = ToolUseResultSchema.safeParse("command output");
      expect(result.success).toBe(true);
    });

    test("accepts empty string", () => {
      const result = ToolUseResultSchema.safeParse("");
      expect(result.success).toBe(true);
    });

    test("accepts multiline string", () => {
      const result = ToolUseResultSchema.safeParse("line1\nline2\nline3");
      expect(result.success).toBe(true);
    });
  });

  describe("TodoToolResult", () => {
    test("accepts empty oldTodos and newTodos", () => {
      const result = ToolUseResultSchema.safeParse({ oldTodos: [], newTodos: [] });
      expect(result.success).toBe(true);
    });

    test("accepts oldTodos only", () => {
      const result = ToolUseResultSchema.safeParse({
        oldTodos: [{ content: "Task 1", status: "pending", priority: "medium", id: "1" }],
      });
      expect(result.success).toBe(true);
    });

    test("accepts newTodos with all statuses", () => {
      const result = ToolUseResultSchema.safeParse({
        newTodos: [
          { content: "Pending task", status: "pending", priority: "low", id: "1" },
          { content: "In-progress task", status: "in_progress", priority: "medium", id: "2" },
          { content: "Completed task", status: "completed", priority: "high", id: "3" },
        ],
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid todo status", () => {
      const result = ToolUseResultSchema.safeParse({
        newTodos: [{ content: "Task", status: "cancelled", priority: "low", id: "1" }],
      });
      // "cancelled" is not a valid status
      expect(result.success).toBe(false);
    });

    test("rejects invalid todo priority", () => {
      const result = ToolUseResultSchema.safeParse({
        newTodos: [{ content: "Task", status: "pending", priority: "critical", id: "1" }],
      });
      // "critical" is not a valid priority
      expect(result.success).toBe(false);
    });
  });

  describe("CommonToolResult - stdout/stderr", () => {
    test("accepts bash-like tool result", () => {
      const result = ToolUseResultSchema.safeParse({
        stdout: "Hello, World!\n",
        stderr: "",
        interrupted: false,
        isImage: false,
      });
      expect(result.success).toBe(true);
    });

    test("accepts interrupted bash result with image flag", () => {
      const result = ToolUseResultSchema.safeParse({
        stdout: "",
        stderr: "Error: command not found",
        interrupted: true,
        isImage: false,
      });
      expect(result.success).toBe(true);
    });

    test("accepts image output result", () => {
      const result = ToolUseResultSchema.safeParse({
        stdout: "base64data",
        stderr: "",
        interrupted: false,
        isImage: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CommonToolResult - create", () => {
    test("accepts file create result", () => {
      const result = ToolUseResultSchema.safeParse({
        type: "create",
        filePath: "/path/to/file.ts",
        content: "export const x = 1;",
        structuredPatch: [],
      });
      expect(result.success).toBe(true);
    });

    test("accepts create result with structured patches", () => {
      const result = ToolUseResultSchema.safeParse({
        type: "create",
        filePath: "/path/to/file.ts",
        content: "new content",
        structuredPatch: [
          {
            oldStart: 1,
            oldLines: 0,
            newStart: 1,
            newLines: 3,
            lines: ["+line1", "+line2", "+line3"],
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CommonToolResult - update", () => {
    test("accepts file update result", () => {
      const result = ToolUseResultSchema.safeParse({
        filePath: "/path/to/file.ts",
        oldString: "const x = 1;",
        newString: "const x = 2;",
        originalFile: "const x = 1;\n",
        userModified: false,
        replaceAll: false,
        structuredPatch: [
          {
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            lines: ["-const x = 1;", "+const x = 2;"],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    test("accepts replaceAll update", () => {
      const result = ToolUseResultSchema.safeParse({
        filePath: "/path/to/file.ts",
        oldString: "foo",
        newString: "bar",
        originalFile: "foo foo foo",
        userModified: true,
        replaceAll: true,
        structuredPatch: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CommonToolResult - search", () => {
    test("accepts glob/grep search result", () => {
      const result = ToolUseResultSchema.safeParse({
        filenames: ["src/index.ts", "src/utils.ts"],
        durationMs: 42,
        numFiles: 2,
        truncated: false,
      });
      expect(result.success).toBe(true);
    });

    test("accepts truncated search result", () => {
      const result = ToolUseResultSchema.safeParse({
        filenames: ["src/a.ts"],
        durationMs: 1000,
        numFiles: 100,
        truncated: true,
      });
      expect(result.success).toBe(true);
    });

    test("accepts empty search result", () => {
      const result = ToolUseResultSchema.safeParse({
        filenames: [],
        durationMs: 5,
        numFiles: 0,
        truncated: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CommonToolResult - text (file read)", () => {
    test("accepts text mode file read result", () => {
      const result = ToolUseResultSchema.safeParse({
        type: "text",
        file: {
          filePath: "/path/to/file.ts",
          content: "export const x = 1;",
          numLines: 1,
          startLine: 1,
          totalLines: 1,
        },
      });
      expect(result.success).toBe(true);
    });

    test("accepts partial file read (startLine > 1)", () => {
      const result = ToolUseResultSchema.safeParse({
        type: "text",
        file: {
          filePath: "/path/to/large-file.ts",
          content: "// lines 100-200",
          numLines: 100,
          startLine: 100,
          totalLines: 500,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CommonToolResult - content mode", () => {
    test("accepts content mode LS result", () => {
      const result = ToolUseResultSchema.safeParse({
        mode: "content",
        numFiles: 3,
        filenames: ["a.ts", "b.ts", "c.ts"],
        content: "a.ts\nb.ts\nc.ts",
        numLines: 3,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    test("rejects null", () => {
      const result = ToolUseResultSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    test("rejects number", () => {
      const result = ToolUseResultSchema.safeParse(42);
      expect(result.success).toBe(false);
    });

    test("rejects unknown object shape", () => {
      const result = ToolUseResultSchema.safeParse({ unknown: "field" });
      expect(result.success).toBe(false);
    });

    test("rejects array of unknown objects", () => {
      // An array is not a valid result type
      const result = ToolUseResultSchema.safeParse([{ unknown: "field" }]);
      expect(result.success).toBe(false);
    });
  });
});
