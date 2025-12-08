import { query as agentSdkQuery } from "@anthropic-ai/claude-agent-sdk";
import {
  type CanUseTool,
  query as claudeCodeQuery,
} from "@anthropic-ai/claude-code";
import { Command, Path } from "@effect/platform";
import { Data, Effect } from "effect";
import { EnvService } from "../../platform/services/EnvService";
import * as ClaudeCodeVersion from "./ClaudeCodeVersion";

type AgentSdkQuery = typeof agentSdkQuery;
type AgentSdkPrompt = Parameters<AgentSdkQuery>[0]["prompt"];
type AgentSdkQueryOptions = NonNullable<
  Parameters<AgentSdkQuery>[0]["options"]
>;

/**
 * npx 実行時のキャッシュディレクトリ（_npx/.../node_modules/.bin）内のパスを検出する。
 */
export const isNpxShimPath = (path: string) =>
  /_npx[/\\].*node_modules[\\/]\.bin/.test(path);

class ClaudeCodePathNotFoundError extends Data.TaggedError(
  "ClaudeCodePathNotFoundError",
)<{
  message: string;
}> {}

const resolveClaudeCodePath = Effect.gen(function* () {
  const path = yield* Path.Path;
  const envService = yield* EnvService;

  // 1. Environment variable (highest priority)
  const specifiedExecutablePath = yield* envService.getEnv(
    "CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH",
  );
  if (specifiedExecutablePath !== undefined) {
    return path.resolve(specifiedExecutablePath);
  }

  // 2. System PATH lookup
  const pathEnv = yield* envService.getEnv("PATH");
  const whichClaude = yield* Command.string(
    Command.make("which", "claude").pipe(
      Command.env({
        PATH: pathEnv,
      }),
      // DO NOT Specify `runInShell(true)` here, it causes resolve node_modules/.bin/claude to be executed.
    ),
  ).pipe(
    Effect.map((output) => output.trim()),
    // npx 実行時に `.npm/_npx/.../node_modules/.bin/claude` が最優先で解決されるのを防ぐ
    Effect.map((output) => (output === "" ? null : output)), // 存在しない時、空文字になる模様
    Effect.catchAll(() => Effect.succeed(null)),
  );

  if (whichClaude !== null && !isNpxShimPath(whichClaude)) {
    return whichClaude;
  }

  const buildInClaude = yield* Command.string(
    Command.make("which", "claude").pipe(Command.runInShell(true)),
  ).pipe(
    Effect.map((output) => output.trim()),
    Effect.map((output) => (output === "" ? null : output)), // 存在しない時、空文字になる模様
    Effect.catchAll(() => Effect.succeed(null)),
  );

  if (buildInClaude === null || isNpxShimPath(buildInClaude)) {
    return yield* Effect.fail(
      new ClaudeCodePathNotFoundError({
        message: "Claude Code CLI not found in any location",
      }),
    );
  }

  return buildInClaude;
});

export const Config = Effect.gen(function* () {
  const claudeCodeExecutablePath = yield* resolveClaudeCodePath;

  const claudeCodeVersion = ClaudeCodeVersion.fromCLIString(
    yield* Command.string(Command.make(claudeCodeExecutablePath, "--version")),
  );

  return {
    claudeCodeExecutablePath,
    claudeCodeVersion,
  };
});

export const getMcpListOutput = (projectCwd: string) =>
  Effect.gen(function* () {
    const { claudeCodeExecutablePath } = yield* Config;
    const output = yield* Command.string(
      Command.make(
        "cd",
        projectCwd,
        "&&",
        claudeCodeExecutablePath,
        "mcp",
        "list",
      ).pipe(Command.runInShell(true)),
    );
    return output;
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
  agentSdk:
    claudeCodeVersion !== null
      ? ClaudeCodeVersion.greaterThanOrEqual(claudeCodeVersion, {
          major: 1,
          minor: 0,
          patch: 125, // ClaudeCodeAgentSDK is available since v1.0.125
        })
      : false,
  sidechainSeparation:
    claudeCodeVersion !== null
      ? ClaudeCodeVersion.greaterThanOrEqual(claudeCodeVersion, {
          major: 2,
          minor: 0,
          patch: 28, // Sidechain conversations stored in agent-*.jsonl since v2.0.28
        })
      : false,
});

export const query = (
  prompt: AgentSdkPrompt,
  options: AgentSdkQueryOptions,
) => {
  const { canUseTool, permissionMode, ...baseOptions } = options;

  return Effect.gen(function* () {
    const { claudeCodeExecutablePath, claudeCodeVersion } = yield* Config;
    const availableFeatures = getAvailableFeatures(claudeCodeVersion);

    const options: AgentSdkQueryOptions = {
      pathToClaudeCodeExecutable: claudeCodeExecutablePath,
      ...baseOptions,
      ...(availableFeatures.canUseTool
        ? { canUseTool, permissionMode }
        : {
            permissionMode: "bypassPermissions",
          }),
    };

    if (availableFeatures.agentSdk) {
      return agentSdkQuery({
        prompt,
        options: {
          systemPrompt: { type: "preset", preset: "claude_code" },
          settingSources: ["user", "project", "local"],
          ...options,
        },
      });
    }

    const fallbackCanUseTool = (() => {
      const canUseTool = options.canUseTool;
      if (canUseTool === undefined) {
        return undefined;
      }

      const fn: CanUseTool = async (toolName, input, canUseToolOptions) => {
        const response = await canUseTool(toolName, input, {
          signal: canUseToolOptions.signal,
          suggestions: canUseToolOptions.suggestions,
          toolUseID: undefined as unknown as string,
        });
        return response;
      };

      return fn;
    })();

    return claudeCodeQuery({
      prompt,
      options: {
        ...options,
        canUseTool: fallbackCanUseTool,
      },
    });
  });
};
