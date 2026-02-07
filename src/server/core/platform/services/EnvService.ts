import { Context, Effect, Layer, Ref } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { type EnvSchema, envSchema } from "../schema";

const LayerImpl = Effect.gen(function* () {
  const envRef = yield* Ref.make<EnvSchema | undefined>(undefined);

  const parseEnv = () => {
    // biome-ignore lint/style/noProcessEnv: allow only here
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error(parsed.error);
      throw new Error(`Invalid environment variables: ${parsed.error.message}`);
    }

    return parsed.data;
  };

  const getEnv = <Key extends keyof EnvSchema>(
    key: Key,
  ): Effect.Effect<EnvSchema[Key]> => {
    return Effect.gen(function* () {
      yield* Ref.update(envRef, (existingEnv) => {
        if (existingEnv === undefined) {
          return parseEnv();
        }
        return existingEnv;
      });

      const env = yield* Ref.get(envRef);
      if (env === undefined) {
        throw new Error(
          "Unexpected error: Environment variables are not loaded",
        );
      }

      return env[key];
    });
  };

  const getAllEnv = (): Effect.Effect<Record<string, string>> => {
    return Effect.sync(() => {
      const entries: Array<[string, string]> = [];
      // biome-ignore lint/style/noProcessEnv: centralized env access
      for (const [key, value] of Object.entries(process.env)) {
        if (typeof value === "string") {
          entries.push([key, value]);
        }
      }
      return Object.fromEntries(entries);
    });
  };

  return {
    getEnv,
    getAllEnv,
  };
});

export type IEnvService = InferEffect<typeof LayerImpl>;

export class EnvService extends Context.Tag("EnvService")<
  EnvService,
  IEnvService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
