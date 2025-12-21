import { describe, expect, test } from "vitest";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import type { ExtendedConversation } from "@/server/core/types";
import { extractToolCalls, filterToolCalls } from "./toolCallExtraction";

describe("extractToolCalls", () => {
  test("should extract tool calls from assistant entries", () => {
    const conversations: ExtendedConversation[] = [
      {
        type: "assistant",
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "test-session",
        version: "1.0",
        uuid: "11111111-1111-1111-1111-111111111111",
        timestamp: "2024-01-01T00:00:00Z",
        parentUuid: null,
        message: {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-3",
          content: [
            {
              type: "tool_use",
              id: "tool_1",
              name: "Edit",
              input: {
                file_path: "/path/to/file.ts",
                old_string: "old",
                new_string: "new",
              },
            },
            {
              type: "tool_use",
              id: "tool_2",
              name: "Bash",
              input: {
                command: "npm install",
                description: "Install dependencies",
              },
            },
          ],
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
      },
    ];

    const getToolResult = (_id: string): ToolResultContent | undefined =>
      undefined;

    const result = extractToolCalls(conversations, getToolResult);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      toolUseId: "tool_1",
      toolName: "Edit",
      toolInput: {
        file_path: "/path/to/file.ts",
        old_string: "old",
        new_string: "new",
      },
      toolResult: undefined,
      conversationIndex: 0,
      timestamp: "2024-01-01T00:00:00Z",
    });
    expect(result[1]).toEqual({
      toolUseId: "tool_2",
      toolName: "Bash",
      toolInput: {
        command: "npm install",
        description: "Install dependencies",
      },
      toolResult: undefined,
      conversationIndex: 0,
      timestamp: "2024-01-01T00:00:00Z",
    });
  });

  test("should match tool calls with their results", () => {
    const conversations: ExtendedConversation[] = [
      {
        type: "assistant",
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "test-session",
        version: "1.0",
        uuid: "11111111-1111-1111-1111-111111111111",
        timestamp: "2024-01-01T00:00:00Z",
        parentUuid: null,
        message: {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-3",
          content: [
            {
              type: "tool_use",
              id: "tool_1",
              name: "Read",
              input: {
                file_path: "/path/to/file.ts",
              },
            },
          ],
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
      },
    ];

    const toolResult: ToolResultContent = {
      type: "tool_result",
      tool_use_id: "tool_1",
      content: "file content",
    };

    const getToolResult = (id: string): ToolResultContent | undefined => {
      if (id === "tool_1") return toolResult;
      return undefined;
    };

    const result = extractToolCalls(conversations, getToolResult);

    expect(result).toHaveLength(1);
    expect(result[0]?.toolResult).toEqual(toolResult);
  });

  test("should skip non-assistant entries", () => {
    const conversations: ExtendedConversation[] = [
      {
        type: "user",
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "test-session",
        version: "1.0",
        uuid: "11111111-1111-1111-1111-111111111111",
        timestamp: "2024-01-01T00:00:00Z",
        parentUuid: null,
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool_1",
              content: "result",
            },
          ],
        },
      },
    ];

    const getToolResult = (_id: string): ToolResultContent | undefined =>
      undefined;

    const result = extractToolCalls(conversations, getToolResult);

    expect(result).toHaveLength(0);
  });

  test("should handle assistant entries with no tool calls", () => {
    const conversations: ExtendedConversation[] = [
      {
        type: "assistant",
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "test-session",
        version: "1.0",
        uuid: "11111111-1111-1111-1111-111111111111",
        timestamp: "2024-01-01T00:00:00Z",
        parentUuid: null,
        message: {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-3",
          content: [
            {
              type: "text",
              text: "Hello world",
            },
          ],
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
      },
    ];

    const getToolResult = (_id: string): ToolResultContent | undefined =>
      undefined;

    const result = extractToolCalls(conversations, getToolResult);

    expect(result).toHaveLength(0);
  });

  test("should preserve conversation index for navigation", () => {
    const conversations: ExtendedConversation[] = [
      {
        type: "assistant",
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "test-session",
        version: "1.0",
        uuid: "11111111-1111-1111-1111-111111111111",
        timestamp: "2024-01-01T00:00:00Z",
        parentUuid: null,
        message: {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-3",
          content: [
            {
              type: "tool_use",
              id: "tool_1",
              name: "Edit",
              input: { file_path: "/file1.ts" },
            },
          ],
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
      },
      {
        type: "user",
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "test-session",
        version: "1.0",
        uuid: "22222222-2222-2222-2222-222222222222",
        timestamp: "2024-01-01T00:01:00Z",
        parentUuid: null,
        message: {
          role: "user",
          content: "continue",
        },
      },
      {
        type: "assistant",
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "test-session",
        version: "1.0",
        uuid: "33333333-3333-3333-3333-333333333333",
        timestamp: "2024-01-01T00:02:00Z",
        parentUuid: null,
        message: {
          id: "msg_3",
          type: "message",
          role: "assistant",
          model: "claude-3",
          content: [
            {
              type: "tool_use",
              id: "tool_2",
              name: "Read",
              input: { file_path: "/file2.ts" },
            },
          ],
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
      },
    ];

    const getToolResult = (_id: string): ToolResultContent | undefined =>
      undefined;

    const result = extractToolCalls(conversations, getToolResult);

    expect(result).toHaveLength(2);
    expect(result[0]?.conversationIndex).toBe(0);
    expect(result[1]?.conversationIndex).toBe(2);
  });
});

describe("filterToolCalls", () => {
  const createToolCall = (
    name: string,
    input: Record<string, unknown>,
    index = 0,
  ) => ({
    toolUseId: `tool_${index}`,
    toolName: name,
    toolInput: input,
    toolResult: undefined,
    conversationIndex: index,
    timestamp: "2024-01-01T00:00:00Z",
  });

  test("should return all tool calls when no filters applied", () => {
    const toolCalls = [
      createToolCall("Edit", { file_path: "/file.ts" }, 0),
      createToolCall("Bash", { command: "npm install" }, 1),
      createToolCall("Read", { file_path: "/other.ts" }, 2),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "",
    });

    expect(result).toEqual(toolCalls);
  });

  test("should filter by single tool type", () => {
    const toolCalls = [
      createToolCall("Edit", { file_path: "/file.ts" }, 0),
      createToolCall("Bash", { command: "npm install" }, 1),
      createToolCall("Read", { file_path: "/other.ts" }, 2),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(["Edit"]),
      pathQuery: "",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.toolName).toBe("Edit");
  });

  test("should filter by multiple tool types", () => {
    const toolCalls = [
      createToolCall("Edit", { file_path: "/file.ts" }, 0),
      createToolCall("Bash", { command: "npm install" }, 1),
      createToolCall("Read", { file_path: "/other.ts" }, 2),
      createToolCall("Write", { file_path: "/new.ts" }, 3),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(["Edit", "Write"]),
      pathQuery: "",
    });

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.toolName).sort()).toEqual(["Edit", "Write"]);
  });

  test("should filter Edit tool by file_path", () => {
    const toolCalls = [
      createToolCall("Edit", { file_path: "/src/components/App.tsx" }, 0),
      createToolCall("Edit", { file_path: "/src/utils/helper.ts" }, 1),
      createToolCall("Edit", { file_path: "/tests/App.test.tsx" }, 2),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "components",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.toolInput).toHaveProperty(
      "file_path",
      "/src/components/App.tsx",
    );
  });

  test("should filter Bash tool by command", () => {
    const toolCalls = [
      createToolCall("Bash", { command: "npm install" }, 0),
      createToolCall("Bash", { command: "git status" }, 1),
      createToolCall("Bash", { command: "npm run build" }, 2),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "npm",
    });

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.toolInput)).toEqual([
      { command: "npm install" },
      { command: "npm run build" },
    ]);
  });

  test("should filter Read/Write tools by file_path", () => {
    const toolCalls = [
      createToolCall("Read", { file_path: "/src/main.ts" }, 0),
      createToolCall("Write", { file_path: "/src/config.json" }, 1),
      createToolCall("Read", { file_path: "/README.md" }, 2),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "src",
    });

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.toolName).sort()).toEqual(["Read", "Write"]);
  });

  test("should filter Glob tool by pattern", () => {
    const toolCalls = [
      createToolCall("Glob", { pattern: "**/*.ts" }, 0),
      createToolCall("Glob", { pattern: "**/*.tsx" }, 1),
      createToolCall("Glob", { pattern: "**/*.json" }, 2),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "tsx",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.toolInput).toHaveProperty("pattern", "**/*.tsx");
  });

  test("should filter Glob tool by path", () => {
    const toolCalls = [
      createToolCall("Glob", { pattern: "*.ts", path: "/src" }, 0),
      createToolCall("Glob", { pattern: "*.ts", path: "/tests" }, 1),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "tests",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.toolInput).toHaveProperty("path", "/tests");
  });

  test("should filter Grep tool by pattern", () => {
    const toolCalls = [
      createToolCall("Grep", { pattern: "TODO" }, 0),
      createToolCall("Grep", { pattern: "FIXME" }, 1),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "FIXME",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.toolInput).toHaveProperty("pattern", "FIXME");
  });

  test("should filter Grep tool by path", () => {
    const toolCalls = [
      createToolCall("Grep", { pattern: "error", path: "/src" }, 0),
      createToolCall("Grep", { pattern: "error", path: "/logs" }, 1),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "logs",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.toolInput).toHaveProperty("path", "/logs");
  });

  test("should be case-insensitive for path query", () => {
    const toolCalls = [
      createToolCall("Edit", { file_path: "/src/Components/App.tsx" }, 0),
      createToolCall("Edit", { file_path: "/src/utils/helper.ts" }, 1),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "components",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.toolInput).toHaveProperty(
      "file_path",
      "/src/Components/App.tsx",
    );
  });

  test("should apply both tool type and path filters simultaneously", () => {
    const toolCalls = [
      createToolCall("Edit", { file_path: "/src/main.ts" }, 0),
      createToolCall("Edit", { file_path: "/tests/main.test.ts" }, 1),
      createToolCall("Read", { file_path: "/src/config.ts" }, 2),
      createToolCall("Bash", { command: "npm test" }, 3),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(["Edit", "Read"]),
      pathQuery: "src",
    });

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.toolName).sort()).toEqual(["Edit", "Read"]);
    expect(
      result.every((t) => {
        const input = t.toolInput;
        return (
          typeof input === "object" &&
          input !== null &&
          "file_path" in input &&
          typeof input.file_path === "string" &&
          input.file_path.includes("src")
        );
      }),
    ).toBe(true);
  });

  test("should handle tools with no searchable content", () => {
    const toolCalls = [
      createToolCall("TodoWrite", { todos: [] }, 0),
      createToolCall("Edit", { file_path: "/src/main.ts" }, 1),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(),
      pathQuery: "todo",
    });

    // TodoWrite has no file_path or command, so it won't match path query
    expect(result).toHaveLength(0);
  });

  test("should return empty array when no matches found", () => {
    const toolCalls = [
      createToolCall("Edit", { file_path: "/src/main.ts" }, 0),
      createToolCall("Bash", { command: "npm install" }, 1),
    ];

    const result = filterToolCalls(toolCalls, {
      toolTypes: new Set(["Read"]),
      pathQuery: "",
    });

    expect(result).toHaveLength(0);
  });

  test("should handle empty tool calls array", () => {
    const result = filterToolCalls([], {
      toolTypes: new Set(["Edit"]),
      pathQuery: "test",
    });

    expect(result).toHaveLength(0);
  });
});
