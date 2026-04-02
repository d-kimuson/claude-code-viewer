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

const claudeDirForTest = `${process.cwd()}/mock-global-claude-dir`;

export const testPlatformLayer = (overrides?: {
  claudeCodePaths?: Partial<ClaudeCodePaths>;
  env?: Partial<EnvSchema>;
  userConfig?: Partial<UserConfig>;
  ccvOptions?: Partial<CcvOptions>;
}) => {
  const applicationContextLayer = Layer.mock(ApplicationContext, {
    claudeCodePaths: Effect.succeed({
      globalClaudeDirectoryPath: claudeDirForTest,
      claudeCommandsDirPath: `${claudeDirForTest}/commands`,
      claudeSkillsDirPath: `${claudeDirForTest}/skills`,
      claudeProjectsDirPath: `${claudeDirForTest}/projects`,
      ...overrides?.claudeCodePaths,
    }),
  });

  const ccvOptionsServiceLayer = Layer.mock(CcvOptionsService, {
    getCcvOptions: <Key extends keyof CcvOptions>(key: Key) =>
      Effect.sync((): CcvOptions[Key] => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test mock returns partial overrides, the cast is safe in test context
        return overrides?.ccvOptions?.[key] as CcvOptions[Key];
      }),
  });

  const envServiceLayer = Layer.mock(EnvService, {
    getEnv: <Key extends keyof EnvSchema>(key: Key) =>
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test mock with generic key requires cast for return type
      Effect.sync(() => {
        switch (key) {
          case "CCV_ENV":
            return overrides?.env?.CCV_ENV ?? "development";
          case "NEXT_PHASE":
            return overrides?.env?.NEXT_PHASE ?? "phase-test";
          case "HOME":
            return overrides?.env?.HOME ?? process.cwd();
          case "PATH":
            return overrides?.env?.PATH ?? undefined;
          case "SHELL":
            return overrides?.env?.SHELL ?? undefined;
          case "CCV_TERMINAL_SHELL":
            return overrides?.env?.CCV_TERMINAL_SHELL ?? undefined;
          case "CCV_TERMINAL_UNRESTRICTED":
            return overrides?.env?.CCV_TERMINAL_UNRESTRICTED ?? undefined;
          case "CCV_TERMINAL_DISABLED":
            return overrides?.env?.CCV_TERMINAL_DISABLED ?? undefined;
          default:
            return undefined;
        }
      }) as Effect.Effect<EnvSchema[Key]>,
  });

  const userConfigServiceLayer = Layer.mock(UserConfigService, {
    setUserConfig: () => Effect.succeed(undefined),
    getUserConfig: () =>
      Effect.succeed<UserConfig>({
        hideNoUserMessageSession: overrides?.userConfig?.hideNoUserMessageSession ?? true,
        unifySameTitleSession: overrides?.userConfig?.unifySameTitleSession ?? true,
        enterKeyBehavior: overrides?.userConfig?.enterKeyBehavior ?? "shift-enter-send",
        locale: overrides?.userConfig?.locale ?? DEFAULT_LOCALE,
        theme: overrides?.userConfig?.theme ?? "system",
        searchHotkey: overrides?.userConfig?.searchHotkey ?? "command-k",
        findHotkey: overrides?.userConfig?.findHotkey ?? "command-f",
        autoScheduleContinueOnRateLimit:
          overrides?.userConfig?.autoScheduleContinueOnRateLimit ?? false,
        modelChoices: overrides?.userConfig?.modelChoices ?? ["default", "haiku", "sonnet", "opus"],
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
