import { Effect, Layer } from "effect";
import { SessionRepository } from "../../server/core/session/infrastructure/SessionRepository";
import type { Session } from "../../server/core/types";

export const testSessionRepositoryLayer = (options?: {
  sessions: Array<Session>;
}) => {
  const { sessions = [] } = options ?? {};

  return Layer.mock(SessionRepository, {
    getSessions: () => {
      return Effect.succeed({ sessions });
    },
    getSession: () => Effect.fail(new Error("Not implemented in mock")),
  });
};
