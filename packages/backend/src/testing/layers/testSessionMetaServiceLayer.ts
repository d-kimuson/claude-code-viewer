import { Effect, Layer } from "effect";
import { SessionMetaService } from "../../core/session/services/SessionMetaService";
import type { SessionMeta } from "../../core/types";

export const testSessionMetaServiceLayer = (options?: {
  meta?: SessionMeta;
  invalidateSession?: () => Effect.Effect<void>;
}) => {
  const {
    meta = {
      messageCount: 0,
      firstUserMessage: null,
    },
    invalidateSession = () => Effect.void,
  } = options ?? {};

  return Layer.mock(SessionMetaService, {
    getSessionMeta: () => Effect.succeed(meta),
    invalidateSession: invalidateSession,
  });
};
