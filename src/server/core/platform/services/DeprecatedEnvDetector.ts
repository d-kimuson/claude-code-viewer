import { Console, Effect } from "effect";

type DeprecationWarning = {
  type: "removed" | "deprecated";
  envKey: string;
  message: string;
  suggestion: string;
};

type DeprecatedEnvConfig = {
  type: "removed" | "deprecated";
  newEnv: string | null;
  cliOption: string;
};

const DEPRECATED_ENVS: Record<string, DeprecatedEnvConfig> = {
  // Removed in PR #101
  CLAUDE_CODE_VIEWER_AUTH_PASSWORD: {
    type: "removed",
    newEnv: "CCV_PASSWORD",
    cliOption: "--password",
  },
  CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH: {
    type: "removed",
    newEnv: "CCV_CC_EXECUTABLE_PATH",
    cliOption: "--executable",
  },
};

const getOptionalEnv = (key: string): string | undefined => {
  // biome-ignore lint/style/noProcessEnv: allow only here
  return process.env[key] ?? undefined;
};

const detectDeprecatedEnvs = (): DeprecationWarning[] => {
  const warnings: DeprecationWarning[] = [];

  for (const [envKey, config] of Object.entries(DEPRECATED_ENVS)) {
    const value = getOptionalEnv(envKey);
    if (value !== undefined) {
      if (config.type === "removed") {
        warnings.push({
          type: "removed",
          envKey,
          message: `Environment variable ${envKey} has been removed.`,
          suggestion: config.newEnv
            ? `Please use ${config.newEnv} environment variable or ${config.cliOption} CLI option instead.`
            : `Please use ${config.cliOption} CLI option instead.`,
        });
      } else {
        warnings.push({
          type: "deprecated",
          envKey,
          message: `Environment variable ${envKey} is deprecated and will be removed in a future release.`,
          suggestion: config.newEnv
            ? `Please migrate to ${config.newEnv} environment variable or ${config.cliOption} CLI option.`
            : `Please use ${config.cliOption} CLI option instead.`,
        });
      }
    }
  }

  return warnings;
};

const formatWarning = (warning: DeprecationWarning): string => {
  const prefix = warning.type === "removed" ? "❌ REMOVED" : "⚠️  DEPRECATED";
  return `${prefix}: ${warning.message}\n   → ${warning.suggestion}`;
};

export const checkDeprecatedEnvs = Effect.gen(function* () {
  const warnings = detectDeprecatedEnvs();

  if (warnings.length === 0) {
    return;
  }

  const hasRemovedEnvs = warnings.some((warning) => warning.type === "removed");

  yield* Console.log("");
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  yield* Console.log("  Migration Guide");
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  yield* Console.log("");

  for (const warning of warnings) {
    yield* Console.log(formatWarning(warning));
    yield* Console.log("");
  }

  yield* Console.log("For more details, see:");
  yield* Console.log(
    "  https://github.com/d-kimuson/claude-code-viewer#configuration",
  );
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  yield* Console.log("");

  if (hasRemovedEnvs) {
    yield* Effect.fail(
      new Error(
        "Cannot start server: removed environment variables detected. Please update your configuration.",
      ),
    );
  }
});
