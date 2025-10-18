import { Effect, Layer } from "effect";
import { SessionRepository } from "../../server/core/session/infrastructure/SessionRepository";

export const testSessionRepositoryLayer = (options?: {
  sessions: Array<{
    id: string;
    jsonlFilePath: string;
    lastModifiedAt: Date;
    meta: {
      messageCount: number;
      firstUserMessage: {
        kind: "command";
        commandName: string;
        commandArgs?: string;
        commandMessage?: string;
      } | null;
    };
  }>;
}) => {
  const { sessions = [] } = options ?? {};

  return Layer.mock(SessionRepository, {
    getSessions: () => {
      return Effect.succeed({ sessions });
    },
    getSession: () => Effect.fail(new Error("Not implemented in mock")),
  });
};
