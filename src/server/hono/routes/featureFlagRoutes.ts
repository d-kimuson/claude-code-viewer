import { Effect } from "effect";
import { Hono } from "hono";
import { FeatureFlagController } from "../../core/feature-flag/presentation/FeatureFlagController.ts";
import { effectToResponse } from "../../lib/effect/toEffectResponse.ts";
import type { HonoContext } from "../app.ts";
import { getHonoRuntime } from "../runtime.ts";

const featureFlagRoutes = Effect.gen(function* () {
  const featureFlagController = yield* FeatureFlagController;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>().get("/", async (c) => {
    const response = await effectToResponse(
      c,
      featureFlagController.getFlags().pipe(Effect.provide(runtime)),
    );

    return response;
  });
});

export { featureFlagRoutes };
