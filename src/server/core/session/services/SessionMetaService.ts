import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import { DrizzleService } from "../../../lib/db/DrizzleService";
import type { SessionRow } from "../../../lib/db/schema";
import { sessions } from "../../../lib/db/schema";
import { parsedUserMessageSchema } from "../../claude-code/functions/parseUserMessage";
import { SyncService } from "../../sync/services/SyncService";
import type { SessionMeta } from "../../types";

const parsedUserMessageOrNullSchema = parsedUserMessageSchema.nullable();

const costBreakdownSchema = z.object({
  inputTokensUsd: z.number(),
  outputTokensUsd: z.number(),
  cacheCreationUsd: z.number(),
  cacheReadUsd: z.number(),
});

const tokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
});

const prLinksSchema = z.array(
  z.object({
    prNumber: z.number(),
    prUrl: z.string(),
    prRepository: z.string(),
  }),
);

const defaultBreakdown = {
  inputTokensUsd: 0,
  outputTokensUsd: 0,
  cacheCreationUsd: 0,
  cacheReadUsd: 0,
};

const defaultTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
};

const rowToSessionMeta = (row: SessionRow): SessionMeta => {
  const firstUserMessage =
    row.firstUserMessageJson !== null
      ? parsedUserMessageOrNullSchema.parse(
          JSON.parse(row.firstUserMessageJson),
        )
      : null;

  const breakdown =
    row.costBreakdownJson !== null
      ? costBreakdownSchema.parse(JSON.parse(row.costBreakdownJson))
      : defaultBreakdown;

  const tokenUsage =
    row.tokenUsageJson !== null
      ? tokenUsageSchema.parse(JSON.parse(row.tokenUsageJson))
      : defaultTokenUsage;

  const prLinks =
    row.prLinksJson !== null
      ? prLinksSchema.parse(JSON.parse(row.prLinksJson))
      : [];

  return {
    messageCount: row.messageCount,
    firstUserMessage,
    customTitle: row.customTitle,
    cost: {
      totalUsd: row.totalCostUsd,
      breakdown,
      tokenUsage,
    },
    modelName: row.modelName,
    prLinks,
  };
};

export class SessionMetaService extends Context.Tag("SessionMetaService")<
  SessionMetaService,
  {
    readonly getSessionMeta: (
      projectId: string,
      sessionId: string,
    ) => Effect.Effect<SessionMeta, Error>;
    readonly invalidateSession: (
      projectId: string,
      sessionId: string,
    ) => Effect.Effect<void>;
  }
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const { db } = yield* DrizzleService;
      const syncService = yield* SyncService;

      const getSessionMeta = (
        projectId: string,
        sessionId: string,
      ): Effect.Effect<SessionMeta, Error> =>
        Effect.gen(function* () {
          const row = db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .get();

          if (row === undefined) {
            // Not in DB yet — sync and retry
            yield* syncService
              .syncSession(projectId, sessionId)
              .pipe(Effect.catchAll(() => Effect.void));

            const retryRow = db
              .select()
              .from(sessions)
              .where(eq(sessions.id, sessionId))
              .get();

            if (retryRow === undefined) {
              return yield* Effect.fail(
                new Error(`Session not found: ${sessionId}`),
              );
            }

            return rowToSessionMeta(retryRow);
          }

          return rowToSessionMeta(row);
        });

      const invalidateSession = (
        projectId: string,
        sessionId: string,
      ): Effect.Effect<void> =>
        syncService
          .syncSession(projectId, sessionId)
          .pipe(Effect.catchAll(() => Effect.void));

      return {
        getSessionMeta,
        invalidateSession,
      };
    }),
  );
}

export type ISessionMetaService = Context.Tag.Service<
  typeof SessionMetaService
>;
