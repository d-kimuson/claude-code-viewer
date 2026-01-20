import { describe, expect, it } from "vitest";
import {
  hasErrorPatterns,
  isStackTraceContent,
  parseToolPreview,
  parseToolResult,
  parseToolUse,
  prettifyMcpToolName,
} from "./toolResultParser";

describe("prettifyMcpToolName", () => {
  it("should prettify MCP tool names", () => {
    expect(prettifyMcpToolName("mcp__slack__send_message")).toBe(
      "Slack: send_message",
    );
    expect(prettifyMcpToolName("mcp__orchestrator__spawn")).toBe(
      "Orchestrator: spawn",
    );
    expect(prettifyMcpToolName("mcp__claude-in-chrome__computer")).toBe(
      "Claude-in-chrome: computer",
    );
  });

  it("should return non-MCP tool names unchanged", () => {
    expect(prettifyMcpToolName("Read")).toBe("Read");
    expect(prettifyMcpToolName("Bash")).toBe("Bash");
  });

  it("should handle edge cases", () => {
    expect(prettifyMcpToolName("mcp__")).toBe("mcp__");
    expect(prettifyMcpToolName("mcp__single")).toBe("mcp__single");
  });
});

describe("parseToolUse", () => {
  it("should parse Read tool", () => {
    const result = parseToolUse("Read", { file_path: "/src/app/main.ts" });
    expect(result.icon).toBe("📄");
    expect(result.summary).toBe("Read: main.ts");
    expect(result.isError).toBe(false);
    expect(result.toolType).toBe("read");
  });

  it("should parse Write tool", () => {
    const result = parseToolUse("Write", { file_path: "/src/new-file.ts" });
    expect(result.icon).toBe("📝");
    expect(result.summary).toBe("Write: new-file.ts (new file)");
    expect(result.isError).toBe(false);
  });

  it("should parse Edit tool", () => {
    const result = parseToolUse("Edit", { file_path: "/src/app.tsx" });
    expect(result.icon).toBe("✏️");
    expect(result.summary).toBe("Edit: app.tsx");
    expect(result.isError).toBe(false);
  });

  it("should parse Bash tool with command", () => {
    const result = parseToolUse("Bash", { command: "pnpm test" });
    expect(result.icon).toBe("💻");
    expect(result.summary).toBe("`pnpm test`");
    expect(result.isError).toBe(false);
  });

  it("should truncate long Bash commands", () => {
    const longCommand =
      "very-long-command-that-exceeds-forty-characters-limit --with-flags";
    const result = parseToolUse("Bash", { command: longCommand });
    expect(result.summary).toBe("`very-long-command-that-exceeds-forty-ch...`");
  });

  it("should parse Grep tool", () => {
    const result = parseToolUse("Grep", { pattern: "TODO" });
    expect(result.icon).toBe("🔍");
    expect(result.summary).toBe('Grep: "TODO"');
    expect(result.isError).toBe(false);
  });

  it("should parse Glob tool", () => {
    const result = parseToolUse("Glob", { pattern: "**/*.tsx" });
    expect(result.icon).toBe("📁");
    expect(result.summary).toBe("Glob: **/*.tsx");
    expect(result.isError).toBe(false);
  });

  it("should parse WebFetch tool", () => {
    const result = parseToolUse("WebFetch", { url: "https://example.com/api" });
    expect(result.icon).toBe("🌐");
    expect(result.summary).toBe("Fetch: example.com");
    expect(result.isError).toBe(false);
  });

  it("should parse MCP tools", () => {
    const result = parseToolUse("mcp__slack__send_message", {});
    expect(result.icon).toBe("🔌");
    expect(result.summary).toBe("Slack: send_message");
    expect(result.toolType).toBe("mcp");
  });

  it("should handle unknown tools", () => {
    const result = parseToolUse("CustomTool", {});
    expect(result.icon).toBe("🔧");
    expect(result.summary).toBe("Tool: CustomTool");
    expect(result.toolType).toBe("unknown");
  });
});

describe("parseToolResult", () => {
  it("should parse Read result with line count", () => {
    const content = "/src/main.ts\nline1\nline2\nline3";
    const result = parseToolResult("Read", content);
    expect(result.icon).toBe("📄");
    expect(result.summary).toContain("main.ts");
    expect(result.summary).toContain("4 lines");
    expect(result.isError).toBe(false);
  });

  it("should detect Bash errors by exit code", () => {
    const content = "Error: command not found\nexit code: 1";
    const result = parseToolResult("Bash", content);
    expect(result.isError).toBe(true);
    expect(result.icon).toBe("❌");
  });

  it("should parse successful Bash result", () => {
    const content = "$ npm test\nAll tests passed\nexit code: 0";
    const result = parseToolResult("Bash", content);
    expect(result.isError).toBe(false);
    expect(result.summary).toContain("exit 0");
  });

  it("should parse Grep result with match count", () => {
    const content =
      "src/a.ts:10:match1\nsrc/b.ts:20:match2\nsrc/c.ts:30:match3";
    const result = parseToolResult("Grep", content);
    expect(result.summary).toContain("3 matches");
    expect(result.isError).toBe(false);
  });

  it("should parse Glob result with file count", () => {
    const content = "src/a.ts\nsrc/b.tsx\nsrc/c.ts";
    const result = parseToolResult("Glob", content);
    expect(result.summary).toContain("3 files");
    expect(result.isError).toBe(false);
  });

  it("should handle MCP tool results", () => {
    const result = parseToolResult(
      "mcp__github__create_pr",
      "PR created successfully",
    );
    expect(result.summary).toBe("Github: create_pr");
    expect(result.isError).toBe(false);
  });

  it("should detect errors in MCP tool results", () => {
    const result = parseToolResult(
      "mcp__slack__send_message",
      "Error: channel not found",
    );
    expect(result.isError).toBe(true);
    expect(result.summary).toContain("error");
  });
});

describe("parseToolPreview", () => {
  it("should parse [Tool: name] format", () => {
    const result = parseToolPreview("[Tool: Read]");
    expect(result).not.toBeNull();
    expect(result?.toolType).toBe("read");
  });

  it("should parse [Tool: name] with file details", () => {
    const result = parseToolPreview("[Tool: Read] main.ts");
    expect(result).not.toBeNull();
    expect(result?.summary).toContain("main.ts");
  });

  it("should parse [Tool: Bash] with command", () => {
    const result = parseToolPreview("[Tool: Bash] `pnpm test`");
    expect(result).not.toBeNull();
    expect(result?.summary).toContain("pnpm test");
  });

  it("should parse MCP tool format", () => {
    const result = parseToolPreview("[Tool: Slack: send_message]");
    expect(result).not.toBeNull();
    expect(result?.toolType).toBe("mcp");
    expect(result?.summary).toContain("Slack");
  });

  it("should parse [Tool Result] format", () => {
    const result = parseToolPreview("[Tool Result] success");
    expect(result).not.toBeNull();
  });

  it("should parse [Tool Result Error] format", () => {
    const result = parseToolPreview("[Tool Result Error] command failed");
    expect(result).not.toBeNull();
    expect(result?.isError).toBe(true);
  });

  it("should return null for non-tool previews", () => {
    const result = parseToolPreview("Hello, world!");
    expect(result).toBeNull();
  });

  it("should detect errors in tool results", () => {
    const result = parseToolPreview("[Tool Result] Error: something failed");
    expect(result).not.toBeNull();
    expect(result?.isError).toBe(true);
  });
});

describe("hasErrorPatterns", () => {
  it("should detect error keywords", () => {
    expect(hasErrorPatterns("Error: something went wrong")).toBe(true);
    expect(hasErrorPatterns("Failed to connect")).toBe(true);
    expect(hasErrorPatterns("Exception occurred")).toBe(true);
    expect(hasErrorPatterns("fatal error")).toBe(true);
  });

  it("should detect exit codes", () => {
    expect(hasErrorPatterns("exit code 1")).toBe(true);
    expect(hasErrorPatterns("exit status 127")).toBe(true);
    expect(hasErrorPatterns("exit code 0")).toBe(false);
  });

  it("should not detect errors in normal content", () => {
    expect(hasErrorPatterns("All tests passed")).toBe(false);
    expect(hasErrorPatterns("Successfully compiled")).toBe(false);
  });
});

describe("isStackTraceContent", () => {
  it("should detect JavaScript stack traces", () => {
    const jsStackTrace = `Error: Something went wrong
    at Object.doSomething (file.js:10:15)
    at main (index.js:5:3)`;
    expect(isStackTraceContent(jsStackTrace)).toBe(true);
  });

  it("should detect Python stack traces", () => {
    const pyStackTrace = `Traceback (most recent call last):
  File "script.py", line 10
    raise ValueError()`;
    expect(isStackTraceContent(pyStackTrace)).toBe(true);
  });

  it("should not detect non-stack-trace content", () => {
    expect(isStackTraceContent("Hello, world!")).toBe(false);
    expect(isStackTraceContent("Normal log output")).toBe(false);
  });
});
