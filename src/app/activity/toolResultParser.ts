/**
 * Smart Tool Result Parser
 *
 * Transforms raw tool results into human-readable summaries with icons.
 */

export interface ParsedToolResult {
  icon: string;
  summary: string;
  isError: boolean;
  toolType: string;
  details?: {
    filePath?: string;
    lineCount?: number;
    addedLines?: number;
    removedLines?: number;
    exitCode?: number;
    command?: string;
    pattern?: string;
    matchCount?: number;
    fileCount?: number;
    domain?: string;
  };
}

// Error patterns to detect failures
const ERROR_PATTERNS = [
  /error/i,
  /failed/i,
  /exception/i,
  /\bfatal\b/i,
  /panic/i,
  /traceback/i,
  /stack trace/i,
  /cannot/i,
  /not found/i,
  /permission denied/i,
  /exit code [1-9]/i,
  /exit status [1-9]/i,
];

// Patterns that indicate "error": null (not a real error)
const ERROR_NULL_PATTERN = /"error"\s*:\s*null/gi;

// Stack trace patterns for formatting
const STACK_TRACE_PATTERNS = [
  /at\s+[\w.]+\s*\([^)]+:\d+:\d+\)/g, // JavaScript/TypeScript
  /File\s+"[^"]+",\s+line\s+\d+/g, // Python
  /^\s*at\s+\S+/gm, // Generic
];

function isStackTrace(content: string): boolean {
  return STACK_TRACE_PATTERNS.some((pattern) => pattern.test(content));
}

function detectError(content: string, exitCode?: number): boolean {
  if (exitCode !== undefined && exitCode !== 0) return true;

  // Remove "error": null patterns (not real errors) before checking
  const cleanedContent = content.replace(ERROR_NULL_PATTERN, '"_no_err": null');

  return ERROR_PATTERNS.some((pattern) => pattern.test(cleanedContent));
}

function extractFilePath(content: string): string | undefined {
  // Common file path patterns
  const patterns = [
    /(?:^|\s)(\/[^\s:]+(?:\.[a-zA-Z0-9]+)?)/m, // Unix paths
    /(?:^|\s)([a-zA-Z]:\\[^\s:]+)/m, // Windows paths
    /(?:^|\s)(\.\/[^\s:]+)/m, // Relative paths
    /(?:^|\s)(src\/[^\s:]+)/m, // src/ paths
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return undefined;
}

function countLines(content: string): number {
  return content.split("\n").length;
}

function extractFileName(filePath: string): string {
  return filePath.split("/").pop() ?? filePath;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // Try to extract domain from partial URL
    const match = url.match(/(?:https?:\/\/)?([^/\s]+)/);
    return match?.[1] ?? url;
  }
}

/**
 * Prettify MCP tool names
 * e.g., "mcp__slack__send_message" -> "Slack: send_message"
 */
export function prettifyMcpToolName(toolName: string): string {
  if (!toolName.startsWith("mcp__")) {
    return toolName;
  }

  const parts = toolName.slice(5).split("__"); // Remove "mcp__" prefix
  if (parts.length < 2) {
    return toolName;
  }

  // Capitalize first letter of server name
  const serverName = parts[0];
  if (!serverName) return toolName;

  const capitalizedServer =
    serverName.charAt(0).toUpperCase() + serverName.slice(1);
  const action = parts.slice(1).join("__");

  return `${capitalizedServer}: ${action}`;
}

interface ToolInput {
  file_path?: string;
  path?: string;
  command?: string;
  pattern?: string;
  query?: string;
  url?: string;
  old_string?: string;
  new_string?: string;
  content?: string;
}

/**
 * Parse a tool use invocation into a readable summary
 */
export function parseToolUse(
  toolName: string,
  input?: ToolInput,
): ParsedToolResult {
  const normalizedName = toolName.toLowerCase();

  // Handle MCP tools
  if (toolName.startsWith("mcp__")) {
    return {
      icon: "🔌",
      summary: prettifyMcpToolName(toolName),
      isError: false,
      toolType: "mcp",
    };
  }

  switch (normalizedName) {
    case "read": {
      const filePath = input?.file_path ?? input?.path ?? "";
      const fileName = extractFileName(filePath);
      return {
        icon: "📄",
        summary: `Read: ${fileName}`,
        isError: false,
        toolType: "read",
        details: { filePath },
      };
    }

    case "write": {
      const filePath = input?.file_path ?? input?.path ?? "";
      const fileName = extractFileName(filePath);
      return {
        icon: "📝",
        summary: `Write: ${fileName} (new file)`,
        isError: false,
        toolType: "write",
        details: { filePath },
      };
    }

    case "edit": {
      const filePath = input?.file_path ?? input?.path ?? "";
      const fileName = extractFileName(filePath);
      return {
        icon: "✏️",
        summary: `Edit: ${fileName}`,
        isError: false,
        toolType: "edit",
        details: { filePath },
      };
    }

    case "bash": {
      const command = input?.command ?? "";
      const shortCommand =
        command.length > 40 ? `${command.slice(0, 40)}...` : command;
      return {
        icon: "💻",
        summary: `\`${shortCommand}\``,
        isError: false,
        toolType: "bash",
        details: { command },
      };
    }

    case "grep": {
      const pattern = input?.pattern ?? "";
      return {
        icon: "🔍",
        summary: `Grep: "${pattern}"`,
        isError: false,
        toolType: "grep",
        details: { pattern },
      };
    }

    case "glob": {
      const pattern = input?.pattern ?? "";
      return {
        icon: "📁",
        summary: `Glob: ${pattern}`,
        isError: false,
        toolType: "glob",
        details: { pattern },
      };
    }

    case "webfetch": {
      const url = input?.url ?? "";
      const domain = extractDomain(url);
      return {
        icon: "🌐",
        summary: `Fetch: ${domain}`,
        isError: false,
        toolType: "webfetch",
        details: { domain },
      };
    }

    case "websearch": {
      const query = input?.query ?? "";
      const shortQuery = query.length > 30 ? `${query.slice(0, 30)}...` : query;
      return {
        icon: "🔎",
        summary: `Search: "${shortQuery}"`,
        isError: false,
        toolType: "websearch",
      };
    }

    case "task": {
      return {
        icon: "🤖",
        summary: "Task: spawn subagent",
        isError: false,
        toolType: "task",
      };
    }

    case "todowrite": {
      return {
        icon: "📋",
        summary: "Update todo list",
        isError: false,
        toolType: "todowrite",
      };
    }

    default:
      return {
        icon: "🔧",
        summary: `Tool: ${toolName}`,
        isError: false,
        toolType: "unknown",
      };
  }
}

interface ToolResultContent {
  type?: string;
  text?: string;
  content?: string | unknown;
}

/**
 * Parse a tool result into a readable summary
 */
export function parseToolResult(
  toolName: string,
  content: string | ToolResultContent[],
  isError?: boolean,
): ParsedToolResult {
  const normalizedName = toolName.toLowerCase();
  let textContent = "";

  // Extract text content
  if (typeof content === "string") {
    textContent = content;
  } else if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === "string") {
        textContent += item;
      } else if (item.type === "text" && item.text) {
        textContent += item.text;
      }
    }
  }

  const hasError = isError ?? detectError(textContent);

  // Handle MCP tools
  if (toolName.startsWith("mcp__")) {
    const prettifiedName = prettifyMcpToolName(toolName);
    return {
      icon: hasError ? "❌" : "🔌",
      summary: hasError ? `${prettifiedName} (error)` : prettifiedName,
      isError: hasError,
      toolType: "mcp",
    };
  }

  switch (normalizedName) {
    case "read": {
      const filePath = extractFilePath(textContent);
      const lineCount = countLines(textContent);
      const fileName = filePath ? extractFileName(filePath) : "file";
      return {
        icon: hasError ? "❌" : "📄",
        summary: hasError
          ? `Read failed: ${fileName}`
          : `📄 ${fileName} (${lineCount} lines)`,
        isError: hasError,
        toolType: "read",
        details: { filePath, lineCount },
      };
    }

    case "write": {
      const filePath = extractFilePath(textContent);
      const fileName = filePath ? extractFileName(filePath) : "file";
      return {
        icon: hasError ? "❌" : "📝",
        summary: hasError
          ? `Write failed: ${fileName}`
          : `📝 ${fileName} (new file)`,
        isError: hasError,
        toolType: "write",
        details: { filePath },
      };
    }

    case "edit": {
      const filePath = extractFilePath(textContent);
      const fileName = filePath ? extractFileName(filePath) : "file";

      // Try to extract line changes
      const addMatch = textContent.match(/\+(\d+)/);
      const removeMatch = textContent.match(/-(\d+)/);
      const addedLines = addMatch
        ? Number.parseInt(addMatch[1] ?? "0", 10)
        : undefined;
      const removedLines = removeMatch
        ? Number.parseInt(removeMatch[1] ?? "0", 10)
        : undefined;

      let summary = `✏️ ${fileName}`;
      if (addedLines !== undefined || removedLines !== undefined) {
        summary += ` (+${addedLines ?? 0}/-${removedLines ?? 0})`;
      }

      return {
        icon: hasError ? "❌" : "✏️",
        summary: hasError ? `Edit failed: ${fileName}` : summary,
        isError: hasError,
        toolType: "edit",
        details: { filePath, addedLines, removedLines },
      };
    }

    case "bash": {
      // Extract exit code
      const exitMatch = textContent.match(
        /exit\s*(?:code|status)?\s*:?\s*(\d+)/i,
      );
      const exitCode = exitMatch
        ? Number.parseInt(exitMatch[1] ?? "0", 10)
        : undefined;
      const bashError = hasError || (exitCode !== undefined && exitCode !== 0);

      // Try to find command from the content
      const commandMatch = textContent.match(/^\$\s*(.+)$/m);
      const command = commandMatch?.[1] ?? "";
      const shortCommand =
        command.length > 30 ? `${command.slice(0, 30)}...` : command;

      const exitDisplay =
        exitCode !== undefined ? exitCode : bashError ? "1" : "0";

      return {
        icon: bashError ? "❌" : "💻",
        summary: command
          ? `\`${shortCommand}\` → ${bashError ? "❌" : ""} exit ${exitDisplay}`
          : bashError
            ? "Command failed"
            : "Command succeeded",
        isError: bashError,
        toolType: "bash",
        details: { exitCode, command },
      };
    }

    case "grep": {
      // Count matches
      const lines = textContent.split("\n").filter((l) => l.trim());
      const matchCount = lines.length;
      const patternMatch = textContent.match(/pattern[:\s]+["']?([^"'\n]+)/i);
      const pattern = patternMatch?.[1] ?? "";

      return {
        icon: hasError ? "❌" : "🔍",
        summary: hasError
          ? "Search failed"
          : `🔍 ${pattern ? `"${pattern}" → ` : ""}${matchCount} matches`,
        isError: hasError,
        toolType: "grep",
        details: { pattern, matchCount },
      };
    }

    case "glob": {
      // Count files
      const lines = textContent.split("\n").filter((l) => l.trim());
      const fileCount = lines.length;
      const patternMatch = textContent.match(/pattern[:\s]+["']?([^"'\n]+)/i);
      const pattern = patternMatch?.[1] ?? "";

      return {
        icon: hasError ? "❌" : "📁",
        summary: hasError
          ? "Glob failed"
          : `📁 ${pattern ? `${pattern} → ` : ""}${fileCount} files`,
        isError: hasError,
        toolType: "glob",
        details: { pattern, fileCount },
      };
    }

    case "webfetch": {
      const urlMatch = textContent.match(
        /(?:url[:\s]+)?["']?(https?:\/\/[^\s"']+)/i,
      );
      const url = urlMatch?.[1] ?? "";
      const domain = extractDomain(url);

      return {
        icon: hasError ? "❌" : "🌐",
        summary: hasError
          ? `Fetch failed: ${domain || "URL"}`
          : `🌐 ${domain || "fetched"}`,
        isError: hasError,
        toolType: "webfetch",
        details: { domain },
      };
    }

    default:
      return {
        icon: hasError ? "❌" : "🔧",
        summary: hasError ? `${toolName} failed` : `${toolName} completed`,
        isError: hasError,
        toolType: "unknown",
      };
  }
}

/**
 * Parse a preview string that starts with "[Tool Result]", "[Tool Result Error]", or "[Tool: name]"
 */
export function parseToolPreview(preview: string): ParsedToolResult | null {
  // Handle [Tool: name] details format (tool use with details)
  // e.g., "[Tool: Read] filename.ts" or "[Tool: Bash] `command`"
  const toolUseDetailMatch = preview.match(/^\[Tool:\s*([^\]]+)\]\s*(.*)/s);
  if (toolUseDetailMatch?.[1]) {
    const toolNamePart = toolUseDetailMatch[1];
    const details = toolUseDetailMatch[2] ?? "";

    // Check if this is an MCP tool format like "Server: action"
    const mcpMatch = toolNamePart.match(/^([^:]+):\s*(.+)$/);
    if (mcpMatch?.[1] && mcpMatch?.[2]) {
      return {
        icon: "🔌",
        summary: `${mcpMatch[1]}: ${mcpMatch[2]}`,
        isError: false,
        toolType: "mcp",
      };
    }

    // Parse as regular tool with details
    const result = parseToolUse(
      toolNamePart.trim(),
      extractInputFromDetails(toolNamePart, details),
    );

    // Update summary to include details if provided
    if (details) {
      result.summary = formatToolSummary(toolNamePart, details);
    }

    return result;
  }

  // Handle [Tool Result Error] format
  const toolResultErrorMatch = preview.match(/^\[Tool Result Error\]\s*(.*)/s);
  if (toolResultErrorMatch) {
    const content = toolResultErrorMatch[1] ?? "";
    const isStackTraceContent = isStackTrace(content);

    return {
      icon: "❌",
      summary: isStackTraceContent
        ? "Error (stack trace)"
        : `Error: ${content.slice(0, 50)}${content.length > 50 ? "..." : ""}`,
      isError: true,
      toolType: "unknown",
    };
  }

  // Handle [Tool Result] format
  const toolResultMatch = preview.match(/^\[Tool Result\]\s*(.*)/s);
  if (toolResultMatch) {
    const content = toolResultMatch[1] ?? "";

    // Try to parse as JSON to extract more info
    try {
      const parsed = JSON.parse(content);
      if (parsed.tool_name) {
        return parseToolResult(
          parsed.tool_name,
          parsed.content ?? content,
          parsed.is_error,
        );
      }
    } catch {
      // Not JSON, try to detect tool type from content
    }

    // Detect error in raw content
    const hasError = detectError(content);
    const isStackTraceContent = isStackTrace(content);

    return {
      icon: hasError ? "❌" : "🔧",
      summary: hasError
        ? isStackTraceContent
          ? "Error (stack trace)"
          : "Tool error"
        : `Result: ${content.slice(0, 50)}${content.length > 50 ? "..." : ""}`,
      isError: hasError,
      toolType: "unknown",
    };
  }

  return null;
}

/**
 * Extract input object from details string based on tool type
 */
function extractInputFromDetails(toolName: string, details: string): ToolInput {
  const normalizedName = toolName.toLowerCase().trim();

  switch (normalizedName) {
    case "read":
    case "write":
    case "edit":
      return { file_path: details.trim() };
    case "bash": {
      // Remove backticks if present
      const command = details.replace(/^`|`$/g, "").trim();
      return { command };
    }
    case "grep": {
      // Remove quotes if present
      const grepPattern = details.replace(/^"|"$/g, "").trim();
      return { pattern: grepPattern };
    }
    case "glob":
      return { pattern: details.trim() };
    case "webfetch":
      return { url: details.trim() };
    default:
      return {};
  }
}

/**
 * Format tool summary from tool name and details
 */
function formatToolSummary(toolName: string, details: string): string {
  const normalizedName = toolName.toLowerCase().trim();

  switch (normalizedName) {
    case "read":
      return `📄 Read: ${details}`;
    case "write":
      return `📝 Write: ${details}`;
    case "edit":
      return `✏️ Edit: ${details}`;
    case "bash":
      return `💻 ${details}`;
    case "grep":
      return `🔍 Grep: ${details}`;
    case "glob":
      return `📁 Glob: ${details}`;
    case "webfetch":
      return `🌐 Fetch: ${details}`;
    default:
      return `🔧 ${toolName}: ${details}`;
  }
}

/**
 * Check if content contains error patterns
 */
export function hasErrorPatterns(content: string): boolean {
  return detectError(content);
}

/**
 * Check if content looks like a stack trace
 */
export function isStackTraceContent(content: string): boolean {
  return isStackTrace(content);
}
