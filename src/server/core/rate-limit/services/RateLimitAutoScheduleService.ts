import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Ref } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { ClaudeCodeSessionProcessService } from "../../claude-code/services/ClaudeCodeSessionProcessService";
import { EventBus } from "../../events/services/EventBus";
import type { InternalEventDeclaration } from "../../events/types/InternalEventDeclaration";
import { UserConfigService } from "../../platform/services/UserConfigService";
import { decodeProjectId } from "../../project/functions/id";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import { SchedulerConfigBaseDir } from "../../scheduler/config";
import { SchedulerService } from "../../scheduler/domain/Scheduler";
import { detectRateLimitFromLastLine } from "../functions/detectRateLimitFromLastLine";
import { parseRateLimitResetTime } from "../functions/parseRateLimitResetTime";
import { readLastLine } from "../functions/readLastLine";

type SessionChangedListener = (
  event: InternalEventDeclaration["sessionChanged"],
) => void;

/**
 * Service that monitors session changes and automatically schedules
 * a "continue" task when a rate limit is detected on a live session.
 *
 * This service:
 * 1. Subscribes to `sessionChanged` events via EventBus
 * 2. When a session changes:
 *    a. Checks if `autoScheduleContinueOnRateLimit` is enabled
 *    b. Checks if the session has a live process
 *    c. Reads the last line of the session JSONL file
 *    d. Detects if it's a rate limit message
 *    e. If yes, creates a scheduled task with the parsed reset time
 */

const LayerImpl = Effect.gen(function* () {
  const eventBus = yield* EventBus;
  const userConfigService = yield* UserConfigService;
  const sessionProcessService = yield* ClaudeCodeSessionProcessService;
  const schedulerService = yield* SchedulerService;
  const fs = yield* FileSystem.FileSystem;
  const pathService = yield* Path.Path;
  const schedulerConfigBaseDir = yield* SchedulerConfigBaseDir;
  const projectRepository = yield* ProjectRepository;
  const lifeCycleService = yield* ClaudeCodeLifeCycleService;

  // Store listener reference for cleanup
  const listenerRef = yield* Ref.make<SessionChangedListener | null>(null);

  /**
   * Checks if a session has a live process.
   * Returns the projectId if found, undefined otherwise.
   */
  const getSessionProcessProjectId = (
    sessionId: string,
  ): Effect.Effect<string | undefined> =>
    Effect.gen(function* () {
      const processes = yield* sessionProcessService.getSessionProcesses();

      // Find a process that matches the sessionId and is in a live state
      const liveProcess = processes.find(
        (process) =>
          process.sessionId === sessionId &&
          (process.type === "initialized" ||
            process.type === "file_created" ||
            process.type === "paused"),
      );

      return liveProcess?.def.projectId;
    });

  /**
   * Checks if a reserved job already exists for this session.
   * This prevents duplicate job creation.
   */
  const hasExistingReservedJobForSession = (sessionId: string) =>
    Effect.gen(function* () {
      const jobs = yield* schedulerService
        .getJobs()
        .pipe(Effect.catchAll(() => Effect.succeed([])));

      return jobs.some(
        (job) =>
          job.schedule.type === "reserved" &&
          job.message.baseSession?.sessionId === sessionId &&
          job.lastRunStatus === null, // Not yet executed
      );
    });

  /**
   * Handles a sessionChanged event.
   * Checks conditions and potentially schedules a continue task.
   */
  const handleSessionChanged = (
    event: InternalEventDeclaration["sessionChanged"],
  ) =>
    Effect.gen(function* () {
      const { projectId, sessionId } = event;

      // 1. Check if auto-schedule is enabled
      const config = yield* userConfigService.getUserConfig();
      if (!config.autoScheduleContinueOnRateLimit) {
        return;
      }

      // 2. Check if session has a live process
      const processProjectId = yield* getSessionProcessProjectId(sessionId);
      if (processProjectId === undefined) {
        return;
      }

      // 3. Check if a job already exists for this session
      const hasExistingJob = yield* hasExistingReservedJobForSession(sessionId);
      if (hasExistingJob) {
        return;
      }

      // 4. Read the last line of the session file
      const projectPath = decodeProjectId(projectId);
      const sessionFilePath = pathService.join(
        projectPath,
        `${sessionId}.jsonl`,
      );

      const lastLine = yield* readLastLine(sessionFilePath).pipe(
        Effect.catchAll(() => Effect.succeed("")),
      );

      if (lastLine === "") {
        return;
      }

      // 5. Detect if it's a rate limit message
      const detection = detectRateLimitFromLastLine(lastLine);
      if (!detection.detected) {
        return;
      }

      // 6. Parse the reset time
      const resetTime = parseRateLimitResetTime(detection.resetTimeText);

      // 7. Create the scheduled job
      yield* schedulerService
        .addJob({
          name: `Rate limit auto-continue: ${sessionId.slice(0, 8)}...`,
          schedule: {
            type: "reserved",
            reservedExecutionTime: resetTime,
          },
          message: {
            content: "continue",
            projectId: processProjectId,
            baseSession: {
              type: "resume",
              sessionId,
            },
          },
          enabled: true,
        })
        .pipe(
          Effect.catchAll((error) => {
            console.error(
              `[RateLimitAutoScheduleService] Failed to add job for session ${sessionId}:`,
              error,
            );
            return Effect.void;
          }),
        );

      console.log(
        `[RateLimitAutoScheduleService] Scheduled continue task for session ${sessionId} at ${resetTime}`,
      );
    });

  // Layer with captured dependencies for running effects in callbacks
  const runtimeLayer = Layer.mergeAll(
    Layer.succeed(FileSystem.FileSystem, fs),
    Layer.succeed(Path.Path, pathService),
    Layer.succeed(SchedulerConfigBaseDir, schedulerConfigBaseDir),
    Layer.succeed(ProjectRepository, projectRepository),
    Layer.succeed(UserConfigService, userConfigService),
    Layer.succeed(ClaudeCodeLifeCycleService, lifeCycleService),
  );

  /**
   * Starts the service by subscribing to sessionChanged events.
   */
  const start = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      // Check if already started
      const existingListener = yield* Ref.get(listenerRef);
      if (existingListener !== null) {
        return;
      }

      const listener: SessionChangedListener = (event) => {
        Effect.runFork(
          handleSessionChanged(event).pipe(Effect.provide(runtimeLayer)),
        );
      };

      yield* Ref.set(listenerRef, listener);
      yield* eventBus.on("sessionChanged", listener);

      console.log("[RateLimitAutoScheduleService] Started");
    });

  /**
   * Stops the service by unsubscribing from sessionChanged events.
   */
  const stop = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      const listener = yield* Ref.get(listenerRef);
      if (listener !== null) {
        yield* eventBus.off("sessionChanged", listener);
        yield* Ref.set(listenerRef, null);
      }
      console.log("[RateLimitAutoScheduleService] Stopped");
    });

  return {
    start,
    stop,
  };
});

export type IRateLimitAutoScheduleService = InferEffect<typeof LayerImpl>;

export class RateLimitAutoScheduleService extends Context.Tag(
  "RateLimitAutoScheduleService",
)<RateLimitAutoScheduleService, IRateLimitAutoScheduleService>() {
  static Live = Layer.effect(this, LayerImpl);
}
