import { randomUUID } from "node:crypto";
import {
  Context,
  Cron,
  Data,
  Duration,
  Effect,
  Fiber,
  Layer,
  Ref,
  Schedule,
} from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { initializeConfig, readConfig, writeConfig } from "../config";
import type {
  NewSchedulerJob,
  SchedulerConfig,
  SchedulerJob,
  UpdateSchedulerJob,
} from "../schema";
import { calculateFixedDelay, executeJob } from "./Job";

class SchedulerJobNotFoundError extends Data.TaggedError(
  "SchedulerJobNotFoundError",
)<{
  readonly jobId: string;
}> {}

class InvalidCronExpressionError extends Data.TaggedError(
  "InvalidCronExpressionError",
)<{
  readonly expression: string;
  readonly cause: unknown;
}> {}

const LayerImpl = Effect.gen(function* () {
  const fibersRef = yield* Ref.make<
    Map<string, Fiber.RuntimeFiber<unknown, unknown>>
  >(new Map());
  const runningJobsRef = yield* Ref.make<Set<string>>(new Set());

  const startJob = (job: SchedulerJob) =>
    Effect.gen(function* () {
      const now = new Date();

      if (job.schedule.type === "cron") {
        const cronResult = Cron.parse(job.schedule.expression);

        if (cronResult._tag === "Left") {
          return yield* Effect.fail(
            new InvalidCronExpressionError({
              expression: job.schedule.expression,
              cause: cronResult.left,
            }),
          );
        }

        const cronSchedule = Schedule.cron(cronResult.right);

        // Wait for the next cron time before starting the repeat loop
        // This prevents immediate execution on job creation/update
        const fiber = yield* Effect.gen(function* () {
          // Get the next scheduled time
          const nextTime = Cron.next(cronResult.right, new Date());
          const nextDelay = Math.max(0, nextTime.getTime() - Date.now());

          // Wait until the next scheduled time
          yield* Effect.sleep(Duration.millis(nextDelay));

          // Then repeat on the cron schedule
          yield* Effect.repeat(runJobWithConcurrencyControl(job), cronSchedule);
        }).pipe(Effect.forkDaemon);

        yield* Ref.update(fibersRef, (fibers) =>
          new Map(fibers).set(job.id, fiber),
        );
      } else if (job.schedule.type === "fixed") {
        // For oneTime jobs, skip scheduling if already executed
        if (job.schedule.oneTime && job.lastRunStatus !== null) {
          return;
        }

        const delay = calculateFixedDelay(job, now);
        const delayDuration = Duration.millis(delay);

        if (job.schedule.oneTime) {
          const fiber = yield* Effect.delay(
            runJobWithConcurrencyControl(job),
            delayDuration,
          ).pipe(Effect.forkDaemon);

          yield* Ref.update(fibersRef, (fibers) =>
            new Map(fibers).set(job.id, fiber),
          );
        } else {
          const schedule = Schedule.spaced(delayDuration);

          const fiber = yield* Effect.repeat(
            runJobWithConcurrencyControl(job),
            schedule,
          ).pipe(Effect.forkDaemon);

          yield* Ref.update(fibersRef, (fibers) =>
            new Map(fibers).set(job.id, fiber),
          );
        }
      }
    });

  const runJobWithConcurrencyControl = (job: SchedulerJob) =>
    Effect.gen(function* () {
      if (job.concurrencyPolicy === "skip") {
        const runningJobs = yield* Ref.get(runningJobsRef);
        if (runningJobs.has(job.id)) {
          return;
        }
      }

      yield* Ref.update(runningJobsRef, (jobs) => new Set(jobs).add(job.id));

      const result = yield* executeJob(job).pipe(
        Effect.matchEffect({
          onSuccess: () =>
            updateJobStatus(job.id, "success", new Date().toISOString()),
          onFailure: () =>
            updateJobStatus(job.id, "failed", new Date().toISOString()),
        }),
      );

      yield* Ref.update(runningJobsRef, (jobs) => {
        const newJobs = new Set(jobs);
        newJobs.delete(job.id);
        return newJobs;
      });

      return result;
    });

  const updateJobStatus = (
    jobId: string,
    status: "success" | "failed",
    runAt: string,
  ) =>
    Effect.gen(function* () {
      const config = yield* readConfig;
      const job = config.jobs.find((j) => j.id === jobId);

      if (job === undefined) {
        return;
      }

      const updatedJob: SchedulerJob = {
        ...job,
        lastRunAt: runAt,
        lastRunStatus: status,
      };

      const updatedConfig: SchedulerConfig = {
        jobs: config.jobs.map((j) => (j.id === jobId ? updatedJob : j)),
      };

      yield* writeConfig(updatedConfig);
    });

  const stopJob = (jobId: string) =>
    Effect.gen(function* () {
      const fibers = yield* Ref.get(fibersRef);
      const fiber = fibers.get(jobId);

      if (fiber !== undefined) {
        yield* Fiber.interrupt(fiber);
        yield* Ref.update(fibersRef, (fibers) => {
          const newFibers = new Map(fibers);
          newFibers.delete(jobId);
          return newFibers;
        });
      }
    });

  const startScheduler = Effect.gen(function* () {
    yield* initializeConfig;
    const config = yield* readConfig;

    for (const job of config.jobs) {
      if (job.enabled) {
        yield* startJob(job);
      }
    }
  });

  const stopScheduler = Effect.gen(function* () {
    const fibers = yield* Ref.get(fibersRef);

    for (const fiber of fibers.values()) {
      yield* Fiber.interrupt(fiber);
    }

    yield* Ref.set(fibersRef, new Map());
  });

  const getJobs = () =>
    Effect.gen(function* () {
      const config = yield* readConfig.pipe(
        Effect.catchTags({
          ConfigFileNotFoundError: () =>
            initializeConfig.pipe(Effect.map(() => ({ jobs: [] }))),
          ConfigParseError: () =>
            initializeConfig.pipe(Effect.map(() => ({ jobs: [] }))),
        }),
      );
      return config.jobs;
    });

  const addJob = (newJob: NewSchedulerJob) =>
    Effect.gen(function* () {
      const config = yield* readConfig.pipe(
        Effect.catchTags({
          ConfigFileNotFoundError: () =>
            initializeConfig.pipe(Effect.map(() => ({ jobs: [] }))),
          ConfigParseError: () =>
            initializeConfig.pipe(Effect.map(() => ({ jobs: [] }))),
        }),
      );
      const job: SchedulerJob = {
        ...newJob,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        lastRunAt: null,
        lastRunStatus: null,
      };

      const updatedConfig: SchedulerConfig = {
        jobs: [...config.jobs, job],
      };

      yield* writeConfig(updatedConfig);

      if (job.enabled) {
        yield* startJob(job);
      }

      return job;
    });

  const updateJob = (jobId: string, updates: UpdateSchedulerJob) =>
    Effect.gen(function* () {
      const config = yield* readConfig.pipe(
        Effect.catchTags({
          ConfigFileNotFoundError: () =>
            initializeConfig.pipe(Effect.map(() => ({ jobs: [] }))),
          ConfigParseError: () =>
            initializeConfig.pipe(Effect.map(() => ({ jobs: [] }))),
        }),
      );
      const job = config.jobs.find((j) => j.id === jobId);

      if (job === undefined) {
        return yield* Effect.fail(new SchedulerJobNotFoundError({ jobId }));
      }

      yield* stopJob(jobId);

      const updatedJob: SchedulerJob = {
        ...job,
        ...updates,
      };

      const updatedConfig: SchedulerConfig = {
        jobs: config.jobs.map((j) => (j.id === jobId ? updatedJob : j)),
      };

      yield* writeConfig(updatedConfig);

      if (updatedJob.enabled) {
        yield* startJob(updatedJob);
      }

      return updatedJob;
    });

  const deleteJob = (jobId: string) =>
    Effect.gen(function* () {
      const config = yield* readConfig.pipe(
        Effect.catchTags({
          ConfigFileNotFoundError: () =>
            initializeConfig.pipe(Effect.map(() => ({ jobs: [] }))),
          ConfigParseError: () =>
            initializeConfig.pipe(Effect.map(() => ({ jobs: [] }))),
        }),
      );
      const job = config.jobs.find((j) => j.id === jobId);

      if (job === undefined) {
        return yield* Effect.fail(new SchedulerJobNotFoundError({ jobId }));
      }

      yield* stopJob(jobId);

      const updatedConfig: SchedulerConfig = {
        jobs: config.jobs.filter((j) => j.id !== jobId),
      };

      yield* writeConfig(updatedConfig);
    });

  return {
    startScheduler,
    stopScheduler,
    getJobs,
    addJob,
    updateJob,
    deleteJob,
  };
});

export type ISchedulerService = InferEffect<typeof LayerImpl>;

export class SchedulerService extends Context.Tag("SchedulerService")<
  SchedulerService,
  ISchedulerService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
