import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import { sessions } from "../../../lib/db/schema.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";

const allowlistSchema = z.array(z.string());

const LayerImpl = Effect.gen(function* () {
  const { db } = yield* DrizzleService;

  const getAllowlist = (sessionId: string): Effect.Effect<readonly string[]> =>
    Effect.sync(() => {
      const row = db
        .select({ permissionAllowlistJson: sessions.permissionAllowlistJson })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .get();

      if (row === undefined || row.permissionAllowlistJson === null) {
        return [];
      }

      const parsed = allowlistSchema.safeParse(JSON.parse(row.permissionAllowlistJson));
      if (!parsed.success) {
        return [];
      }

      return parsed.data;
    });

  const addRule = (sessionId: string, rule: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      const current = yield* getAllowlist(sessionId);

      if (current.includes(rule)) {
        return;
      }

      const updated = [...current, rule];

      db.update(sessions)
        .set({ permissionAllowlistJson: JSON.stringify(updated) })
        .where(eq(sessions.id, sessionId))
        .run();
    });

  return {
    getAllowlist,
    addRule,
  };
});

export type ISessionAllowlistRepository = InferEffect<typeof LayerImpl>;

export class SessionAllowlistRepository extends Context.Tag("SessionAllowlistRepository")<
  SessionAllowlistRepository,
  ISessionAllowlistRepository
>() {
  static Live = Layer.effect(this, LayerImpl);
}
