import { Effect } from "effect";
import { Hono } from "hono";
import { FeatureFlagController } from "../../core/feature-flag/presentation/FeatureFlagController";
import { effectToResponse } from "../../lib/effect/toEffectResponse";
import type { HonoContext } from "../app";
import { getHonoRuntime } from "../runtime";

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
