import { Context, Effect, Layer, Ref } from "effect";
import type { InferEffect } from "../../../lib/effect/types.ts";

export type CliOptions = {
  port: string;
  hostname: string;
  verbose?: boolean | undefined;
  password?: string | undefined;
  executable?: string | undefined;
  claudeDir?: string | undefined;
  terminalDisabled?: boolean | undefined;
  terminalShell?: string | undefined;
  terminalUnrestricted?: boolean | undefined;
  apiOnly?: boolean | undefined;
};

export type CcvOptions = {
  port: number;
  hostname: string;
  verbose?: boolean | undefined;
  password?: string | undefined;
  executable?: string | undefined;
  claudeDir?: string | undefined;
  terminalDisabled?: boolean | undefined;
  terminalShell?: string | undefined;
  terminalUnrestricted?: boolean | undefined;
  apiOnly?: boolean | undefined;
};

const getOptionalEnv = (key: string): string | undefined => {
  // biome-ignore lint/style/noProcessEnv: allow only here
  // oxlint-disable-next-line node/no-process-env -- configuration boundary
  return process.env[key] ?? undefined;
};

const isFlagEnabled = (value: string | undefined) => {
  if (value === undefined || value === "") return false;
  return value === "1" || value.toLowerCase() === "true";
};

const toCcvOptions = (cliOptions?: CliOptions): CcvOptions => {
  return {
    port: Number.parseInt(cliOptions?.port ?? getOptionalEnv("PORT") ?? "3000", 10),
    hostname: cliOptions?.hostname ?? getOptionalEnv("HOSTNAME") ?? "localhost",
    verbose:
      cliOptions?.verbose ?? (isFlagEnabled(getOptionalEnv("CCV_VERBOSE")) ? true : undefined),
    password: cliOptions?.password ?? getOptionalEnv("CCV_PASSWORD") ?? undefined,
    executable: cliOptions?.executable ?? getOptionalEnv("CCV_CC_EXECUTABLE_PATH") ?? undefined,
    claudeDir: cliOptions?.claudeDir ?? getOptionalEnv("CCV_GLOBAL_CLAUDE_DIR"),
    terminalDisabled:
      cliOptions?.terminalDisabled ??
      (isFlagEnabled(getOptionalEnv("CCV_TERMINAL_DISABLED")) ? true : undefined),
    terminalShell: cliOptions?.terminalShell ?? getOptionalEnv("CCV_TERMINAL_SHELL") ?? undefined,
    terminalUnrestricted:
      cliOptions?.terminalUnrestricted ??
      (isFlagEnabled(getOptionalEnv("CCV_TERMINAL_UNRESTRICTED")) ? true : undefined),
    apiOnly:
      cliOptions?.apiOnly ?? (isFlagEnabled(getOptionalEnv("CCV_API_ONLY")) ? true : undefined),
  };
};

const LayerImpl = Effect.gen(function* () {
  const ccvOptionsRef = yield* Ref.make<CcvOptions>(toCcvOptions());

  const loadCliOptions = (cliOptions: CliOptions) => {
    return Effect.gen(function* () {
      yield* Ref.update(ccvOptionsRef, () => toCcvOptions(cliOptions));
    });
  };

  const getCcvOptions = <K extends keyof CcvOptions>(key: K) => {
    return Effect.gen(function* () {
      const ccvOptions = yield* Ref.get(ccvOptionsRef);
      return ccvOptions[key];
    });
  };

  return {
    loadCliOptions,
    getCcvOptions,
  };
});

export type ICcvOptionsService = InferEffect<typeof LayerImpl>;

export class CcvOptionsService extends Context.Tag("CcvOptionsService")<
  CcvOptionsService,
  ICcvOptionsService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
