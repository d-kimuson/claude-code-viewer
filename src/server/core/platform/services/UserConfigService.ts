import { Context, Effect, Layer, Ref } from "effect";
import type { UserConfig } from "../../../lib/config/config";
import type { InferEffect } from "../../../lib/effect/types";

const LayerImpl = Effect.gen(function* () {
  const configRef = yield* Ref.make<UserConfig>({
    hideNoUserMessageSession: true,
    unifySameTitleSession: true,
    enterKeyBehavior: "shift-enter-send",
    permissionMode: "default",
    locale: "ja",
    theme: "system",
  });

  const setUserConfig = (newConfig: UserConfig) =>
    Effect.gen(function* () {
      yield* Ref.update(configRef, () => newConfig);
    });

  const getUserConfig = () =>
    Effect.gen(function* () {
      const config = yield* Ref.get(configRef);
      return config;
    });

  return {
    getUserConfig,
    setUserConfig,
  };
});

export type IUserConfigService = InferEffect<typeof LayerImpl>;
export class UserConfigService extends Context.Tag("UserConfigService")<
  UserConfigService,
  IUserConfigService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
