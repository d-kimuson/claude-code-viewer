import { query as originalQuery } from "@anthropic-ai/claude-code";
import { Command, Path } from "@effect/platform";
import { Effect } from "effect";
import { env } from "../../../lib/env";
import * as ClaudeCodeVersion from "./ClaudeCodeVersion";

type CCQuery = typeof originalQuery;
type CCQueryPrompt = Parameters<CCQuery>[0]["prompt"];
type CCQueryOptions = NonNullable<Parameters<CCQuery>[0]["options"]>;

export const Config = Effect.gen(function* () {
  const path = yield* Path.Path;

  const specifiedExecutablePath = env.get(
    "CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH",
  );

  const claudeCodeExecutablePath =
    specifiedExecutablePath !== undefined
      ? path.resolve(specifiedExecutablePath)
      : (yield* Command.string(
          Command.make("which", "claude").pipe(
            Command.env({
              PATH: env.get("PATH"),
            }),
            Command.runInShell(true),
          ),
        )).trim();

  const claudeCodeVersion = ClaudeCodeVersion.fromCLIString(
    yield* Command.string(Command.make(claudeCodeExecutablePath, "--version")),
  );

  return {
    claudeCodeExecutablePath,
    claudeCodeVersion,
  };
});

export const getAvailableFeatures = (
  claudeCodeVersion: ClaudeCodeVersion.ClaudeCodeVersion | null,
) => ({
  canUseTool:
    claudeCodeVersion !== null
      ? ClaudeCodeVersion.greaterThanOrEqual(claudeCodeVersion, {
          major: 1,
          minor: 0,
          patch: 82,
        })
      : false,
  uuidOnSDKMessage:
    claudeCodeVersion !== null
      ? ClaudeCodeVersion.greaterThanOrEqual(claudeCodeVersion, {
          major: 1,
          minor: 0,
          patch: 86,
        })
      : false,
});

export const query = (prompt: CCQueryPrompt, options: CCQueryOptions) => {
  const { canUseTool, permissionMode, ...baseOptions } = options;

  return Effect.gen(function* () {
    const { claudeCodeExecutablePath, claudeCodeVersion } = yield* Config;
    const availableFeatures = getAvailableFeatures(claudeCodeVersion);

    return originalQuery({
      prompt,
      options: {
        pathToClaudeCodeExecutable: claudeCodeExecutablePath,
        ...baseOptions,
        ...(availableFeatures.canUseTool
          ? { canUseTool, permissionMode }
          : {
              permissionMode: "bypassPermissions",
            }),
      },
    });
  });
};
