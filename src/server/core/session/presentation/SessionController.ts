import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { SessionRepository } from "../../session/infrastructure/SessionRepository";
import { generateSessionHtml } from "../services/ExportService";

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

  const exportSessionHtml = (options: {
    projectId: string;
    sessionId: string;
  }) =>
    Effect.gen(function* () {
      const { projectId, sessionId } = options;

      const { session } = yield* sessionRepository.getSession(
        projectId,
        sessionId,
      );

      if (session === null) {
        return {
          status: 404,
          response: { error: "Session not found" },
        } as const satisfies ControllerResponse;
      }

      const html = yield* generateSessionHtml(session, projectId);

      return {
        status: 200,
        response: { html },
      } as const satisfies ControllerResponse;
    });

  return {
    getSession,
    exportSessionHtml,
  };
});

export type ISessionController = InferEffect<typeof LayerImpl>;
export class SessionController extends Context.Tag("SessionController")<
  SessionController,
  ISessionController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
