import { resolve } from "node:path";
import { Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { EventBus } from "../../core/events/services/EventBus";
import type { EnvSchema } from "../../core/platform/schema";
import {
  ApplicationContext,
  type IApplicationContext,
} from "../../core/platform/services/ApplicationContext";
import { EnvService } from "../../core/platform/services/EnvService";
import { UserConfigService } from "../../core/platform/services/UserConfigService";
import type { UserConfig } from "../../lib/config/config";

const claudeDirForTest = resolve(process.cwd(), "mock-global-claude-dir");

export const testPlatformLayer = (overrides?: {
  applicationContext?: Partial<IApplicationContext>;
  env?: Partial<EnvSchema>;
  userConfig?: Partial<UserConfig>;
}) => {
  const applicationContextLayer = Layer.mock(ApplicationContext, {
    ...overrides?.applicationContext,

    claudeCodePaths: {
      globalClaudeDirectoryPath: resolve(claudeDirForTest),
      claudeCommandsDirPath: resolve(claudeDirForTest, "commands"),
      claudeProjectsDirPath: resolve(claudeDirForTest, "projects"),
      ...overrides?.applicationContext?.claudeCodePaths,
    },
  });

  const envServiceLayer = Layer.mock(EnvService, {
    getEnv: <Key extends keyof EnvSchema>(key: Key) =>
      Effect.sync(() => {
        switch (key) {
          case "NODE_ENV":
            return overrides?.env?.NODE_ENV ?? "development";
          case "NEXT_PHASE":
            return overrides?.env?.NEXT_PHASE ?? "phase-test";
          case "CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH":
            return (
              overrides?.env?.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH ??
              resolve(process.cwd(), "node_modules", ".bin", "claude")
            );
          case "GLOBAL_CLAUDE_DIR":
            return overrides?.env?.GLOBAL_CLAUDE_DIR ?? claudeDirForTest;
          default:
            return overrides?.env?.[key] ?? undefined;
        }
      }) as Effect.Effect<EnvSchema[Key]>,
  });

  const userConfigServiceLayer = Layer.mock(UserConfigService, {
    setUserConfig: () => Effect.succeed(undefined),
    getUserConfig: () =>
      Effect.succeed<UserConfig>({
        hideNoUserMessageSession:
          overrides?.userConfig?.hideNoUserMessageSession ?? true,
        unifySameTitleSession:
          overrides?.userConfig?.unifySameTitleSession ?? true,
        enterKeyBehavior:
          overrides?.userConfig?.enterKeyBehavior ?? "shift-enter-send",
        permissionMode: overrides?.userConfig?.permissionMode ?? "default",
        locale: overrides?.userConfig?.locale ?? "ja",
      }),
  });

  return Layer.mergeAll(
    applicationContextLayer,
    userConfigServiceLayer,
    EventBus.Live,
    envServiceLayer,
    Path.layer,
  );
};
