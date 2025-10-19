import { query as agentSdkQuery } from "@anthropic-ai/claude-agent-sdk";
import { query as claudeCodeQuery } from "@anthropic-ai/claude-code";
import { Command, Path } from "@effect/platform";
import { Effect } from "effect";
import { EnvService } from "../../platform/services/EnvService";
import * as ClaudeCodeVersion from "./ClaudeCodeVersion";

type CCQuery = typeof claudeCodeQuery;
type CCQueryPrompt = Parameters<CCQuery>[0]["prompt"];
type CCQueryOptions = NonNullable<Parameters<CCQuery>[0]["options"]>;

type AgentSdkQuery = typeof agentSdkQuery;
type AgentSdkQueryOptions = NonNullable<
  Parameters<AgentSdkQuery>[0]["options"]
>;

type SharedOptions = Pick<
  CCQueryOptions,
  Extract<keyof AgentSdkQueryOptions, keyof CCQueryOptions>
>;

export const Config = Effect.gen(function* () {
  const path = yield* Path.Path;
  const envService = yield* EnvService;

  const specifiedExecutablePath = yield* envService.getEnv(
    "CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH",
  );

  const claudeCodeExecutablePath =
    specifiedExecutablePath !== undefined
      ? path.resolve(specifiedExecutablePath)
      : (yield* Command.string(
          Command.make("which", "claude").pipe(
            Command.env({
              PATH: yield* envService.getEnv("PATH"),
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
});

export const query = (prompt: CCQueryPrompt, options: SharedOptions) => {
  const { canUseTool, permissionMode, ...baseOptions } = options;

  return Effect.gen(function* () {
    const { claudeCodeExecutablePath, claudeCodeVersion } = yield* Config;
    const availableFeatures = getAvailableFeatures(claudeCodeVersion);

    const options: SharedOptions = {
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

    return claudeCodeQuery({
      prompt,
      options: options,
    });
  });
};
