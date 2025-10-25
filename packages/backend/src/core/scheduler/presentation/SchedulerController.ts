import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { SchedulerService } from "../domain/Scheduler";
import type { NewSchedulerJob, UpdateSchedulerJob } from "../schema";

const LayerImpl = Effect.gen(function* () {
  const schedulerService = yield* SchedulerService;

  const getJobs = () =>
    Effect.gen(function* () {
      const jobs = yield* schedulerService.getJobs();
      return {
        response: jobs,
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const addJob = (options: { job: NewSchedulerJob }) =>
    Effect.gen(function* () {
      const { job } = options;
      const result = yield* schedulerService.addJob(job);
      return {
        response: result,
        status: 201,
      } as const satisfies ControllerResponse;
    });

  const updateJob = (options: { id: string; job: UpdateSchedulerJob }) =>
    Effect.gen(function* () {
      const { id, job } = options;
      const result = yield* schedulerService
        .updateJob(id, job)
        .pipe(
          Effect.catchTag("SchedulerJobNotFoundError", () =>
            Effect.succeed(null),
          ),
        );

      if (result === null) {
        return {
          response: { error: "Job not found" },
          status: 404,
        } as const satisfies ControllerResponse;
      }

      return {
        response: result,
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const deleteJob = (options: { id: string }) =>
    Effect.gen(function* () {
      const { id } = options;
      const result = yield* schedulerService.deleteJob(id).pipe(
        Effect.catchTag("SchedulerJobNotFoundError", () =>
          Effect.succeed(false),
        ),
        Effect.map(() => true),
      );

      if (!result) {
        return {
          response: { error: "Job not found" },
          status: 404,
        } as const satisfies ControllerResponse;
      }

      return {
        response: { success: true },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    getJobs,
    addJob,
    updateJob,
    deleteJob,
  };
});

export type ISchedulerController = InferEffect<typeof LayerImpl>;

export class SchedulerController extends Context.Tag("SchedulerController")<
  SchedulerController,
  ISchedulerController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
