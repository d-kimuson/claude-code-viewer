import { resolve } from "node:path";
import { Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { DEFAULT_LOCALE } from "../../lib/i18n/localeDetection";
import { EventBus } from "../../server/core/events/services/EventBus";
import type { EnvSchema } from "../../server/core/platform/schema";
import {
  ApplicationContext,
  type ClaudeCodePaths,
} from "../../server/core/platform/services/ApplicationContext";
import {
  type CcvOptions,
  CcvOptionsService,
} from "../../server/core/platform/services/CcvOptionsService";
import { EnvService } from "../../server/core/platform/services/EnvService";
import { UserConfigService } from "../../server/core/platform/services/UserConfigService";
import type { UserConfig } from "../../server/lib/config/config";

const claudeDirForTest = resolve(process.cwd(), "mock-global-claude-dir");

export const testPlatformLayer = (overrides?: {
  claudeCodePaths?: Partial<ClaudeCodePaths>;
  env?: Partial<EnvSchema>;
  userConfig?: Partial<UserConfig>;
  ccvOptions?: Partial<CcvOptions>;
}) => {
  const applicationContextLayer = Layer.mock(ApplicationContext, {
    claudeCodePaths: Effect.succeed({
      globalClaudeDirectoryPath: resolve(claudeDirForTest),
      claudeCommandsDirPath: resolve(claudeDirForTest, "commands"),
      claudeSkillsDirPath: resolve(claudeDirForTest, "skills"),
      claudeProjectsDirPath: resolve(claudeDirForTest, "projects"),
      ...overrides?.claudeCodePaths,
    }),
  });

  const ccvOptionsServiceLayer = Layer.mock(CcvOptionsService, {
    getCcvOptions: <Key extends keyof CcvOptions>(key: Key) =>
      Effect.sync((): CcvOptions[Key] => {
        return overrides?.ccvOptions?.[key] as CcvOptions[Key];
      }),
  });

  const envServiceLayer = Layer.mock(EnvService, {
    getEnv: <Key extends keyof EnvSchema>(key: Key) =>
      Effect.sync(() => {
        switch (key) {
          case "NODE_ENV":
            return overrides?.env?.NODE_ENV ?? "development";
          case "NEXT_PHASE":
            return overrides?.env?.NEXT_PHASE ?? "phase-test";
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
        locale: overrides?.userConfig?.locale ?? DEFAULT_LOCALE,
        theme: overrides?.userConfig?.theme ?? "system",
      }),
  });

  return Layer.mergeAll(
    applicationContextLayer,
    userConfigServiceLayer,
    EventBus.Live,
    ccvOptionsServiceLayer,
    envServiceLayer,
    Path.layer,
  );
};
