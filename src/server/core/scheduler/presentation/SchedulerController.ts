import type { FileSystem, Path } from "@effect/platform";
import type { CommandExecutor } from "@effect/platform/CommandExecutor";
import { Context, Effect, Layer, Runtime } from "effect";
import { Hono, type Context as HonoContext } from "hono";
import type { InferEffect } from "../../../lib/effect/types";
import type { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import type { EnvService } from "../../platform/services/EnvService";
import type { UserConfigService } from "../../platform/services/UserConfigService";
import type { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import { SchedulerService } from "../domain/Scheduler";
import { newSchedulerJobSchema, updateSchedulerJobSchema } from "../schema";

const LayerImpl = Effect.gen(function* () {
  const schedulerService = yield* SchedulerService;

  const runtime = yield* Effect.runtime<
    | FileSystem.FileSystem
    | Path.Path
    | CommandExecutor
    | EnvService
    | ProjectRepository
    | UserConfigService
    | ClaudeCodeLifeCycleService
  >();

  const app = new Hono()
    .get("/jobs", async (c: HonoContext) => {
      const result = await Runtime.runPromise(runtime)(
        schedulerService.getJobs(),
      );
      return c.json(result);
    })
    .post("/jobs", async (c: HonoContext) => {
      const body = await c.req.json();
      const parsed = newSchedulerJobSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          { error: "Invalid request body", details: parsed.error },
          400,
        );
      }

      const result = await Runtime.runPromise(runtime)(
        schedulerService.addJob(parsed.data),
      );
      return c.json(result, 201);
    })
    .patch("/jobs/:id", async (c: HonoContext) => {
      const id = c.req.param("id");
      const body = await c.req.json();
      const parsed = updateSchedulerJobSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          { error: "Invalid request body", details: parsed.error },
          400,
        );
      }

      const result = await Runtime.runPromise(runtime)(
        schedulerService
          .updateJob(id, parsed.data)
          .pipe(
            Effect.catchTag("SchedulerJobNotFoundError", () =>
              Effect.succeed(null),
            ),
          ),
      );

      if (result === null) {
        return c.json({ error: "Job not found" }, 404);
      }

      return c.json(result);
    })
    .delete("/jobs/:id", async (c: HonoContext) => {
      const id = c.req.param("id");

      const result = await Runtime.runPromise(runtime)(
        schedulerService.deleteJob(id).pipe(
          Effect.catchTag("SchedulerJobNotFoundError", () =>
            Effect.succeed(false),
          ),
          Effect.map(() => true),
        ),
      );

      if (!result) {
        return c.json({ error: "Job not found" }, 404);
      }

      return c.json({ success: true }, 200);
    });

  return { app };
});

export type ISchedulerController = InferEffect<typeof LayerImpl>;

export class SchedulerController extends Context.Tag("SchedulerController")<
  SchedulerController,
  ISchedulerController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
