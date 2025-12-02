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
      Command.runInShell(true),
    ),
  ).pipe(
    Effect.map((output) => output.trim()),
    Effect.map((output) => (output === "" ? null : output)), // 存在しない時、空文字になる模様
    Effect.catchAll(() => Effect.succeed(null)),
  );

  if (whichClaude !== null) {
    return whichClaude;
  }

  // 3. Project dependency @anthropic-ai/claude-code/cli.js (fallback)
  const projectClaudeCode = yield* Effect.try(() => {
    // Next.js では import.meta.resolve が使えない
    // __dirname もバンドルされてしまうため、無理やりパスを組み立てる
    const parts = __dirname.split("/");
    const packagePath = parts
      .slice(0, parts.indexOf("claude-code-viewer") + 1)
      .join("/");

    return path.join(
      packagePath,
      "node_modules",
      "@anthropic-ai",
      "claude-code",
      "cli.js",
    );
  }).pipe(
    Effect.catchAll(() => {
      return Effect.fail(
        new ClaudeCodePathNotFoundError({
          message: "Claude Code CLI not found in any location",
        }),
      );
    }),
  );

  return projectClaudeCode;
});

export const Config = Effect.gen(function* () {
  const claudeCodeExecutablePath = yield* resolveClaudeCodePath;

  const claudeCodeVersion = ClaudeCodeVersion.fromCLIString(
    yield* Command.string(
      Command.make(claudeCodeExecutablePath, "--version").pipe(
        Command.runInShell(true),
      ),
    ),
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
