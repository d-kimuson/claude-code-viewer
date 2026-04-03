import { describe, expect, test } from "vitest";
import { buildClaudeCommand } from "./claude-command";

describe("buildClaudeCommand", () => {
  test("basic command with just text", () => {
    const result = buildClaudeCommand({ text: "hello world" });
    expect(result).toBe('claude "hello world"');
  });

  test("command with sessionId (resume)", () => {
    const result = buildClaudeCommand({
      text: "continue",
      sessionId: "abc-123",
    });
    expect(result).toBe('claude --resume "abc-123" "continue"');
  });

  test("command with model option", () => {
    const result = buildClaudeCommand({
      text: "hello",
      ccOptions: { model: "sonnet" },
    });
    expect(result).toBe('claude --model "sonnet" "hello"');
  });

  test("command with permissionMode", () => {
    const result = buildClaudeCommand({
      text: "hello",
      ccOptions: { permissionMode: "bypassPermissions" },
    });
    expect(result).toBe('claude --permission-mode "bypassPermissions" "hello"');
  });

  test("command with permissionMode default is omitted", () => {
    const result = buildClaudeCommand({
      text: "hello",
      ccOptions: { permissionMode: "default" },
    });
    expect(result).toBe('claude "hello"');
  });

  test("command with multiple options combined", () => {
    const result = buildClaudeCommand({
      text: "do something",
      sessionId: "session-456",
      ccOptions: {
        model: "opus",
        permissionMode: "acceptEdits",
        maxTurns: 10,
        disallowedTools: ["Bash", "Write"],
        systemPrompt: "Be concise",
      },
    });
    expect(result).toBe(
      'claude --resume "session-456" --model "opus" --permission-mode "acceptEdits" --max-turns 10 --disallowedTools "Bash,Write" --system-prompt "Be concise" "do something"',
    );
  });

  test("shell escaping of double quotes in messages", () => {
    const result = buildClaudeCommand({ text: 'say "hello"' });
    expect(result).toBe('claude "say \\"hello\\""');
  });

  test("shell escaping of dollar signs and backticks", () => {
    const result = buildClaudeCommand({ text: "cost is $100 and `cmd`" });
    expect(result).toBe('claude "cost is \\$100 and \\`cmd\\`"');
  });

  test("shell escaping of backslashes", () => {
    const result = buildClaudeCommand({ text: "path\\to\\file" });
    expect(result).toBe('claude "path\\\\to\\\\file"');
  });

  test("preserves UTF-8 characters (Japanese)", () => {
    const result = buildClaudeCommand({ text: "こんにちは世界" });
    expect(result).toBe('claude "こんにちは世界"');
  });

  test("preserves UTF-8 characters with special chars", () => {
    const result = buildClaudeCommand({ text: 'テスト: "引用" と $変数' });
    expect(result).toBe('claude "テスト: \\"引用\\" と \\$変数"');
  });

  test("ignores non-CLI options like effort, maxThinkingTokens, maxBudgetUsd", () => {
    const result = buildClaudeCommand({
      text: "hello",
      ccOptions: {
        effort: "high",
        maxThinkingTokens: 1000,
        maxBudgetUsd: 5,
      },
    });
    expect(result).toBe('claude "hello"');
  });

  test("ignores systemPrompt when it is an object (preset type)", () => {
    const result = buildClaudeCommand({
      text: "hello",
      ccOptions: {
        systemPrompt: { type: "preset", preset: "claude_code", append: "extra" },
      },
    });
    expect(result).toBe('claude "hello"');
  });

  test("empty systemPrompt string produces --system-prompt flag", () => {
    const result = buildClaudeCommand({
      text: "hello",
      ccOptions: { systemPrompt: "" },
    });
    expect(result).toBe('claude --system-prompt "" "hello"');
  });

  test("command with agent option", () => {
    const result = buildClaudeCommand({
      text: "hello",
      ccOptions: { agent: "my-agent" },
    });
    expect(result).toBe('claude --agent "my-agent" "hello"');
  });

  test("empty agent string is omitted", () => {
    const result = buildClaudeCommand({
      text: "hello",
      ccOptions: { agent: "" },
    });
    expect(result).toBe('claude "hello"');
  });
});
