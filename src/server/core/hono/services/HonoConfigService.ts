import { Context, Effect, Layer, Ref } from "effect";
import type { Config } from "../../../lib/config/config";
import type { InferEffect } from "../../../lib/effect/types";

const LayerImpl = Effect.gen(function* () {
  const configRef = yield* Ref.make<Config>({
    hideNoUserMessageSession: true,
    unifySameTitleSession: true,
    enterKeyBehavior: "shift-enter-send",
    permissionMode: "default",
  });

  const setConfig = (newConfig: Config) =>
    Effect.gen(function* () {
      yield* Ref.update(configRef, () => newConfig);
    });

  const getConfig = () =>
    Effect.gen(function* () {
      const config = yield* Ref.get(configRef);
      return config;
    });

  return {
    getConfig,
    setConfig,
  };
});

export type IHonoConfigService = InferEffect<typeof LayerImpl>;
export class HonoConfigService extends Context.Tag("HonoConfigService")<
  HonoConfigService,
  IHonoConfigService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
