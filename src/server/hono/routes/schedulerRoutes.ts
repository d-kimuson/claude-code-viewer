import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { SchedulerController } from "../../core/scheduler/presentation/SchedulerController";
import {
  newSchedulerJobSchema,
  updateSchedulerJobSchema,
} from "../../core/scheduler/schema";
import { effectToResponse } from "../../lib/effect/toEffectResponse";
import type { HonoContext } from "../app";
import { getHonoRuntime } from "../runtime";

const schedulerRoutes = Effect.gen(function* () {
  const schedulerController = yield* SchedulerController;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>()
    .get("/jobs", async (c) => {
      const response = await effectToResponse(
        c,
        schedulerController.getJobs().pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .post("/jobs", zValidator("json", newSchedulerJobSchema), async (c) => {
      const response = await effectToResponse(
        c,
        schedulerController
          .addJob({
            job: c.req.valid("json"),
          })
          .pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .patch(
      "/jobs/:id",
      zValidator("json", updateSchedulerJobSchema),
      async (c) => {
        const response = await effectToResponse(
          c,
          schedulerController
            .updateJob({
              id: c.req.param("id"),
              job: c.req.valid("json"),
            })
            .pipe(Effect.provide(runtime)),
        );
        return response;
      },
    )
    .delete("/jobs/:id", async (c) => {
      const response = await effectToResponse(
        c,
        schedulerController
          .deleteJob({
            id: c.req.param("id"),
          })
          .pipe(Effect.provide(runtime)),
      );
      return response;
    });
});

export { schedulerRoutes };
