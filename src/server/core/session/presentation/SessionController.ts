import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { SessionRepository } from "../../session/infrastructure/SessionRepository";

const LayerImpl = Effect.gen(function* () {
  const sessionRepository = yield* SessionRepository;

  const getSession = (options: { projectId: string; sessionId: string }) =>
    Effect.gen(function* () {
      const { projectId, sessionId } = options;

      const { session } = yield* sessionRepository.getSession(
        projectId,
        sessionId,
      );

      return {
        status: 200,
        response: { session },
      } as const satisfies ControllerResponse;
    });

  return {
    getSession,
  };
});

export type ISessionController = InferEffect<typeof LayerImpl>;
export class SessionController extends Context.Tag("SessionController")<
  SessionController,
  ISessionController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
