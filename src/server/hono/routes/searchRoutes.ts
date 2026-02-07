import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { z } from "zod";
import { SearchController } from "../../core/search/presentation/SearchController";
import { effectToResponse } from "../../lib/effect/toEffectResponse";
import type { HonoContext } from "../app";
import { getHonoRuntime } from "../runtime";

const searchRoutes = Effect.gen(function* () {
  const searchController = yield* SearchController;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>().get(
    "/",
    zValidator(
      "query",
      z.object({
        q: z.string().min(2),
        limit: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : undefined)),
        projectId: z.string().optional(),
      }),
    ),
    async (c) => {
      const { q, limit, projectId } = c.req.valid("query");
      const response = await effectToResponse(
        c,
        searchController
          .search({ query: q, limit, projectId })
          .pipe(Effect.provide(runtime)),
      );
      return response;
    },
  );
});

export { searchRoutes };
