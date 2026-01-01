import { Context, Effect, Layer, Ref } from "effect";
import type { InferEffect } from "../../../lib/effect/types";

export type CliOptions = {
  port: string;
  hostname: string;
  password?: string | undefined;
  executable?: string | undefined;
  claudeDir?: string | undefined;
};

export type CcvOptions = {
  port: number;
  hostname: string;
  password?: string | undefined;
  executable?: string | undefined;
  claudeDir?: string | undefined;
};

const getOptionalEnv = (key: string): string | undefined => {
  // biome-ignore lint/style/noProcessEnv: allow only here
  return process.env[key] ?? undefined;
};

const LayerImpl = Effect.gen(function* () {
  const ccvOptionsRef = yield* Ref.make<CcvOptions | undefined>(undefined);

  const loadCliOptions = (cliOptions: CliOptions) => {
    return Effect.gen(function* () {
      yield* Ref.update(ccvOptionsRef, () => {
        return {
          port: Number.parseInt(
            cliOptions.port ?? getOptionalEnv("PORT") ?? "3000",
            10,
          ),
          hostname:
            cliOptions.hostname ?? getOptionalEnv("HOSTNAME") ?? "localhost",
          password:
            cliOptions.password ?? getOptionalEnv("CCV_PASSWORD") ?? undefined,
          executable:
            cliOptions.executable ??
            getOptionalEnv("CCV_CC_EXECUTABLE_PATH") ??
            undefined,
          claudeDir:
            cliOptions.claudeDir ?? getOptionalEnv("CCV_GLOBAL_CLAUDE_DIR"),
        };
      });
    });
  };

  const getCcvOptions = <K extends keyof CcvOptions>(key: K) => {
    return Effect.gen(function* () {
      const ccvOptions = yield* Ref.get(ccvOptionsRef);
      if (ccvOptions === undefined) {
        throw new Error("Unexpected error: CCV options are not loaded");
      }
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
