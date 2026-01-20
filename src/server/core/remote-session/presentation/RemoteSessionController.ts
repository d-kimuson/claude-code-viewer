import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { RemoteSessionService } from "../services/RemoteSessionService";

const LayerImpl = Effect.gen(function* () {
  const remoteSessionService = yield* RemoteSessionService;

  const getRemoteSession = (options: { url: string }) =>
    Effect.gen(function* () {
      const { url } = options;

      const conversations = yield* remoteSessionService
        .fetchRemoteSession(url)
        .pipe(
          Effect.catchTag("RemoteSessionFetchError", (error) =>
            Effect.succeed({
              status: 502,
              response: { error: `Failed to fetch session: ${error.message}` },
            } as const satisfies ControllerResponse),
          ),
          Effect.catchTag("RemoteSessionParseError", (error) =>
            Effect.succeed({
              status: 400,
              response: { error: `Failed to parse session: ${error.message}` },
            } as const satisfies ControllerResponse),
          ),
        );

      if ("status" in conversations) {
        return conversations;
      }

      return {
        status: 200,
        response: { conversations },
      } as const satisfies ControllerResponse;
    });

  return {
    getRemoteSession,
  };
});

export type IRemoteSessionController = InferEffect<typeof LayerImpl>;
export class RemoteSessionController extends Context.Tag(
  "RemoteSessionController",
)<RemoteSessionController, IRemoteSessionController>() {
  static Live = Layer.effect(this, LayerImpl);
}
