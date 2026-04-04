import type { CCOptionsSchema } from "@/server/core/claude-code/schema";

/**
 * Check if a string contains non-ASCII characters.
 */
const hasNonAscii = (value: string): boolean => /[^\u0020-\u007e]/.test(value);

/**
 * Shell-escape a string using double quotes.
 * Escapes backslashes, double quotes, dollar signs, and backticks.
 */
const shellEscapeDouble = (value: string): string => {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
  return `"${escaped}"`;
};

/**
 * Shell-escape a string using $'...' ANSI-C quoting with \xNN byte escapes
 * for non-ASCII characters. This avoids terminal paste encoding issues
 * where multibyte UTF-8 characters get mangled into <e3><81><93> etc.
 */
const shellEscapeAnsiC = (value: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  let result = "$'";
  for (const byte of bytes) {
    if (byte === 0x27) {
      // single quote
      result += "\\'";
    } else if (byte === 0x5c) {
      // backslash
      result += "\\\\";
    } else if (byte >= 0x20 && byte <= 0x7e) {
      // printable ASCII
      result += String.fromCharCode(byte);
    } else {
      // Non-ASCII byte or control character: use \xNN escape
      result += `\\x${byte.toString(16).padStart(2, "0")}`;
    }
  }
  result += "'";
  return result;
};

/**
 * Shell-escape a string. Uses double quotes for ASCII-only values,
 * and $'...' ANSI-C quoting for values with non-ASCII characters.
 */
const shellEscape = (value: string): string =>
  hasNonAscii(value) ? shellEscapeAnsiC(value) : shellEscapeDouble(value);

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
