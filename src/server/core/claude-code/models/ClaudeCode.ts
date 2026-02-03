import * as agentSdk from "@anthropic-ai/claude-agent-sdk";
import { Command, Path } from "@effect/platform";
import { Data, Effect } from "effect";
import { uniq } from "es-toolkit";
import { CcvOptionsService } from "../../platform/services/CcvOptionsService";
import * as ClaudeCodeVersion from "./ClaudeCodeVersion";

type AgentSdkQuery = typeof agentSdk.query;
type AgentSdkPrompt = Parameters<AgentSdkQuery>[0]["prompt"];
type AgentSdkQueryOptions = NonNullable<
  Parameters<AgentSdkQuery>[0]["options"]
>;

const npxCacheRegExp = /_npx[/\\].*node_modules[\\/]\.bin/;
const localNodeModulesBinRegExp = new RegExp(
  `${process.cwd()}/node_modules/.bin`,
);

export const claudeCodePathPriority = (path: string): number => {
  if (npxCacheRegExp.test(path)) {
    return 0;
  }

  if (localNodeModulesBinRegExp.test(path)) {
    return 1;
  }

  return 2;
};

class ClaudeCodePathNotFoundError extends Data.TaggedError(
  "ClaudeCodePathNotFoundError",
)<{
  message: string;
}> {}

class ClaudeCodeAgentSdkNotSupportedError extends Data.TaggedError(
  "ClaudeCodeAgentSdkNotSupportedError",
)<{
  message: string;
}> {}

const resolveClaudeCodePath = Effect.gen(function* () {
  const path = yield* Path.Path;
  const ccvOptionsService = yield* CcvOptionsService;

  // Environment variable (highest priority)
  const specifiedExecutablePath =
    yield* ccvOptionsService.getCcvOptions("executable");
  if (specifiedExecutablePath !== undefined) {
    return path.resolve(specifiedExecutablePath);
  }

  // System PATH lookup
  const claudePaths = yield* Command.string(
    Command.make("which", "-a", "claude").pipe(Command.runInShell(true)),
  ).pipe(
    Effect.map(
      (output) =>
        output
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line !== "") ?? [],
    ),
    Effect.map((paths) =>
      uniq(paths).toSorted((a, b) => {
        const aPriority = claudeCodePathPriority(a);
        const bPriority = claudeCodePathPriority(b);

        if (aPriority < bPriority) {
          return 1;
        }
        if (aPriority > bPriority) {
          return -1;
        }

        return 0;
      }),
    ),
    Effect.catchAll(() => Effect.succeed<string[]>([])),
  );

  const resolvedClaudePath = claudePaths.at(0);

  if (resolvedClaudePath === undefined) {
    return yield* Effect.fail(
      new ClaudeCodePathNotFoundError({
        message: "Claude Code CLI not found in any location",
      }),
    );
  }

  return resolvedClaudePath;
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
  runSkillsDirectly:
    claudeCodeVersion !== null
      ? ClaudeCodeVersion.greaterThanOrEqual(claudeCodeVersion, {
          major: 2,
          minor: 1,
          patch: 0,
        }) ||
        ClaudeCodeVersion.greaterThanOrEqual(claudeCodeVersion, {
          major: 2,
          minor: 0,
          patch: 77,
        })
      : false,
});

export const query = (
  prompt: AgentSdkPrompt,
  options: AgentSdkQueryOptions,
) => {
  const {
    canUseTool,
    permissionMode,
    hooks,
    systemPrompt,
    settingSources,
    ...baseOptions
  } = options;

  return Effect.gen(function* () {
    const { claudeCodeExecutablePath, claudeCodeVersion } = yield* Config;
    const availableFeatures = getAvailableFeatures(claudeCodeVersion);

    const options: AgentSdkQueryOptions = {
      ...baseOptions,
      systemPrompt,
      settingSources,
      pathToClaudeCodeExecutable: claudeCodeExecutablePath,
      disallowedTools: [
        "AskUserQuestion",
        ...(baseOptions.disallowedTools ?? []),
      ], // Cannot answer from web interface instead of CLI
      ...(availableFeatures.canUseTool
        ? { canUseTool, permissionMode }
        : {
            permissionMode: "bypassPermissions",
          }),
    };

    if (!availableFeatures.agentSdk) {
      return yield* new ClaudeCodeAgentSdkNotSupportedError({
        message: "Agent SDK is not supported in this version of Claude Code",
      });
    }

    return agentSdk.query({
      prompt,
      options: {
        settingSources: ["user", "project", "local"],
        ...options,
      },
    });
  });
};
