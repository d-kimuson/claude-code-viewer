import { Effect } from "effect";
import type { AssistantEntry } from "@/lib/conversation-schema/entry/AssistantEntrySchema";
import { SchedulerService } from "../../scheduler/domain/Scheduler";
import {
  calculateResumeDateTime,
  parseRateLimitMessage,
} from "./parseRateLimitMessage";

/**
 * Type for rate limit checkable entry (subset of AssistantEntry)
 */
type RateLimitCheckable = {
  type: "assistant";
  isApiErrorMessage?: boolean;
  message: {
    content: AssistantEntry["message"]["content"];
  };
};

/**
 * Parameters for creating a rate limit resume job
 */
export type CreateRateLimitResumeJobParams = {
  readonly entry: RateLimitCheckable;
  readonly sessionId: string;
  readonly projectId: string;
  readonly autoResumeEnabled: boolean;
};

/**
 * Creates or updates a scheduled job to automatically resume a session when rate limit resets.
 *
 * @param params - Parameters including the assistant entry, session ID, project ID, and auto-resume setting
 * @returns Effect that yields the created/updated job, or null if conditions aren't met
 *
 * @example
 * const job = yield* createRateLimitResumeJob({
 *   entry: assistantEntry,
 *   sessionId: "session-123",
 *   projectId: "project-456",
 *   autoResumeEnabled: true
 * });
 */
export const createRateLimitResumeJob = ({
  entry,
  sessionId,
  projectId,
  autoResumeEnabled,
}: CreateRateLimitResumeJobParams) =>
  Effect.gen(function* () {
    // Check if auto-resume is enabled
    if (!autoResumeEnabled) {
      return null;
    }

    // Parse rate limit message
    const resetTime = parseRateLimitMessage(entry);
    if (!resetTime) {
      return null;
    }

    // Calculate resume datetime
    const resumeDateTime = calculateResumeDateTime(resetTime);
    if (!resumeDateTime) {
      return null;
    }

    // Get scheduler service
    const scheduler = yield* SchedulerService;

    // Check if a job already exists for this session
    const existingJobs = yield* scheduler
      .getJobs()
      .pipe(Effect.catchAll(() => Effect.succeed([])));
    const existingJob = existingJobs.find(
      (job) =>
        job.message.baseSessionId === sessionId &&
        job.name.includes("Auto-resume"),
    );

    // Create or update the job
    if (existingJob) {
      // Update existing job with new resume time
      // Ignore errors (job might have been deleted)
      const updatedJob = yield* scheduler
        .updateJob(existingJob.id, {
          schedule: {
            type: "reserved",
            reservedExecutionTime: resumeDateTime,
          },
        })
        .pipe(Effect.catchAll(() => Effect.succeed(null)));

      if (updatedJob) {
        return updatedJob;
      }
    }

    // Create new job (errors are caught and return null)
    const job = yield* scheduler
      .addJob({
        name: `Auto-resume: ${sessionId}`,
        schedule: {
          type: "reserved",
          reservedExecutionTime: resumeDateTime,
        },
        message: {
          content: "continue",
          projectId,
          baseSessionId: sessionId,
        },
        enabled: true,
      })
      .pipe(Effect.catchAll(() => Effect.succeed(null)));

    return job;
  });
