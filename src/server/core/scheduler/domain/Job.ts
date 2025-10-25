import { Effect } from "effect";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { UserConfigService } from "../../platform/services/UserConfigService";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import type { SchedulerJob } from "../schema";

export const executeJob = (job: SchedulerJob) =>
  Effect.gen(function* () {
    const lifeCycleService = yield* ClaudeCodeLifeCycleService;
    const projectRepository = yield* ProjectRepository;
    const userConfigService = yield* UserConfigService;

    const { message } = job;
    const { project } = yield* projectRepository.getProject(message.projectId);
    const userConfig = yield* userConfigService.getUserConfig();

    if (project.meta.projectPath === null) {
      return yield* Effect.fail(
        new Error(`Project path not found for projectId: ${message.projectId}`),
      );
    }

    yield* lifeCycleService.startTask({
      baseSession: {
        cwd: project.meta.projectPath,
        projectId: message.projectId,
        sessionId: message.baseSessionId ?? undefined,
      },
      userConfig,
      message: message.content,
    });
  });

export const shouldExecuteJob = (job: SchedulerJob, now: Date): boolean => {
  if (!job.enabled) {
    return false;
  }

  if (job.schedule.type === "cron") {
    return true;
  }

  if (job.schedule.type === "reserved") {
    // Reserved jobs are one-time, skip if already executed
    if (job.lastRunStatus !== null) {
      return false;
    }

    const scheduledTime = new Date(job.schedule.reservedExecutionTime);
    return now >= scheduledTime;
  }

  return true;
};

export const calculateReservedDelay = (
  job: SchedulerJob,
  now: Date,
): number => {
  if (job.schedule.type !== "reserved") {
    throw new Error("Job schedule type must be reserved");
  }

  const scheduledTime = new Date(job.schedule.reservedExecutionTime);
  const delay = scheduledTime.getTime() - now.getTime();

  return Math.max(0, delay);
};
