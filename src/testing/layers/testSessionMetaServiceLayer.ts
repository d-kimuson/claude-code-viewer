import { Effect, Layer } from "effect";
import { SessionMetaService } from "../../server/core/session/services/SessionMetaService";
import { createMockSessionMeta } from "../../server/core/session/testing/createMockSessionMeta";
import type { SessionMeta } from "../../server/core/types";

export const testSessionMetaServiceLayer = (options?: {
  meta?: SessionMeta;
  invalidateSession?: () => Effect.Effect<void>;
}) => {
  const {
    meta = createMockSessionMeta(),
    invalidateSession = () => Effect.void,
  } = options ?? {};

  return Layer.mock(SessionMetaService, {
    getSessionMeta: () => Effect.succeed(meta),
    invalidateSession: invalidateSession,
  });
};
