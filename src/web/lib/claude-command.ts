import type { CCOptionsSchema } from "@/server/core/claude-code/schema";

/**
 * Shell-escape a string using double quotes.
 * Double quotes preserve UTF-8 characters correctly when pasted into terminals,
 * while single quotes can cause mojibake with multibyte characters in some environments.
 */
const shellEscape = (value: string): string => {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
  return `"${escaped}"`;
};

type BuildClaudeCommandParams = {
  text: string;
  sessionId?: string;
  ccOptions?: CCOptionsSchema;
};

/**
 * Builds a `claude` CLI command string from chat form inputs.
 */
export const buildClaudeCommand = ({
  text,
  sessionId,
  ccOptions,
}: BuildClaudeCommandParams): string => {
  const parts: string[] = ["claude"];

  if (sessionId !== undefined && sessionId !== "") {
    parts.push("--resume", shellEscape(sessionId));
  }

  if (ccOptions !== undefined) {
    if (ccOptions.model !== undefined && ccOptions.model !== "") {
      parts.push("--model", shellEscape(ccOptions.model));
    }

    if (ccOptions.permissionMode !== undefined && ccOptions.permissionMode !== "default") {
      parts.push("--permission-mode", shellEscape(ccOptions.permissionMode));
    }

    if (ccOptions.maxTurns !== undefined) {
      parts.push("--max-turns", String(ccOptions.maxTurns));
    }

    if (ccOptions.disallowedTools !== undefined && ccOptions.disallowedTools.length > 0) {
      parts.push("--disallowedTools", shellEscape(ccOptions.disallowedTools.join(",")));
    }

    if (typeof ccOptions.systemPrompt === "string") {
      parts.push("--system-prompt", shellEscape(ccOptions.systemPrompt));
    }

    if (ccOptions.agent !== undefined && ccOptions.agent !== "") {
      parts.push("--agent", shellEscape(ccOptions.agent));
    }
  }

  parts.push(shellEscape(text));

  return parts.join(" ");
};
