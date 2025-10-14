import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { query } from "@anthropic-ai/claude-code";
import { env } from "../../lib/env";
import { ClaudeCodeVersion } from "./ClaudeCodeVersion";

type CCQuery = typeof query;
type CCQueryPrompt = Parameters<CCQuery>[0]["prompt"];
type CCQueryOptions = NonNullable<Parameters<CCQuery>[0]["options"]>;

export class ClaudeCodeExecutor {
  private pathToClaudeCodeExecutable: string;
  private claudeCodeVersion: ClaudeCodeVersion | null;

  constructor() {
    const executablePath = env.get("CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH");
    this.pathToClaudeCodeExecutable =
      executablePath !== undefined
        ? resolve(executablePath)
        : execSync("which claude", {}).toString().trim();
    this.claudeCodeVersion = ClaudeCodeVersion.fromCLIString(
      execSync(`${this.pathToClaudeCodeExecutable} --version`, {}).toString(),
    );
  }

  public get features() {
    return {
      enableToolApproval:
        this.claudeCodeVersion?.greaterThanOrEqual(
          new ClaudeCodeVersion({ major: 1, minor: 0, patch: 82 }),
        ) ?? false,
      extractUuidFromSDKMessage:
        this.claudeCodeVersion?.greaterThanOrEqual(
          new ClaudeCodeVersion({ major: 1, minor: 0, patch: 86 }),
        ) ?? false,
    };
  }

  public query(prompt: CCQueryPrompt, options: CCQueryOptions) {
    const { canUseTool, ...baseOptions } = options;

    return query({
      prompt,
      options: {
        pathToClaudeCodeExecutable: this.pathToClaudeCodeExecutable,
        ...baseOptions,
        ...(this.features.enableToolApproval ? { canUseTool } : {}),
      },
    });
  }
}
