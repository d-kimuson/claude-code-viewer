import type { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Ref, Runtime } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import type { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { EventBus } from "../../events/services/EventBus";
import type { InternalEventDeclaration } from "../../events/types/InternalEventDeclaration";
import { UserConfigService } from "../../platform/services/UserConfigService";
import type { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import type { SchedulerConfigBaseDir } from "../../scheduler/config";
import type { SchedulerService } from "../../scheduler/domain/Scheduler";
import { createRateLimitResumeJob } from "../functions/createRateLimitResumeJob";
import { parseRateLimitMessage } from "../functions/parseRateLimitMessage";
import { SessionRepository } from "../infrastructure/SessionRepository";

/**
 * Service implementation following InferEffect pattern.
 * Creates the service layer and infers the service type from implementation.
 */
const makeRateLimitMonitor = Effect.gen(function* () {
  const eventBus = yield* EventBus;
  const sessionRepository = yield* SessionRepository;
  const userConfigService = yield* UserConfigService;

  // Get runtime with all dependencies needed for the monitoring effect
  const runtime = yield* Effect.runtime<
    | Path.Path
    | FileSystem.FileSystem
    | ProjectRepository
    | UserConfigService
    | ClaudeCodeLifeCycleService
    | SchedulerConfigBaseDir
    | SchedulerService
  >();

  // Listener reference for cleanup
  const listenerRef = yield* Ref.make<
    ((event: InternalEventDeclaration["sessionChanged"]) => void) | null
  >(null);

  const startMonitoring = () =>
    Effect.gen(function* () {
      const currentListener = yield* Ref.get(listenerRef);
      if (currentListener) {
        // Already monitoring
        return;
      }

      // Create listener for sessionChanged events
      const listener = (event: InternalEventDeclaration["sessionChanged"]) => {
        const { projectId, sessionId } = event;

        // Run the monitoring logic asynchronously without blocking
        const monitoringEffect = Effect.gen(function* () {
          // Get session data
          const { session } = yield* sessionRepository
            .getSession(projectId, sessionId)
            .pipe(
              // Gracefully handle errors (session might not exist yet)
              Effect.catchAll(() => Effect.succeed({ session: null })),
            );

          if (!session) {
            return;
          }

          // Get the latest conversation (last in array)
          const lastConversation =
            session.conversations[session.conversations.length - 1];
          if (!lastConversation || lastConversation.type !== "assistant") {
            return;
          }

          // Check if this is a rate limit message
          const resetTime = parseRateLimitMessage(lastConversation);
          if (!resetTime) {
            return;
          }

          // Get user config to check if auto-resume is enabled
          const userConfig = yield* userConfigService.getUserConfig();

          // Create resume job
          yield* createRateLimitResumeJob({
            entry: lastConversation,
            sessionId,
            projectId,
            autoResumeEnabled: userConfig.autoResumeOnRateLimit ?? false,
          }).pipe(
            // Catch all errors to prevent monitoring from crashing
            Effect.catchAll(() => Effect.void),
            Effect.withSpan("create-rate-limit-resume-job"),
          );
        });

        Runtime.runFork(runtime)(monitoringEffect);
      };

      // Subscribe to sessionChanged events
      yield* eventBus.on("sessionChanged", listener);

      yield* Ref.set(listenerRef, listener);
    });

  const stopMonitoring = () =>
    Effect.gen(function* () {
      const currentListener = yield* Ref.get(listenerRef);
      if (currentListener) {
        yield* eventBus.off("sessionChanged", currentListener);
        yield* Ref.set(listenerRef, null);
      }
    });

  return {
    startMonitoring,
    stopMonitoring,
  } as const;
});

/**
 * Infer the service type from the implementation.
 * This follows the InferEffect pattern used in EventBus.
 */
export type IRateLimitMonitor = InferEffect<typeof makeRateLimitMonitor>;

/**
 * Service that monitors session changes and automatically creates
 * resume jobs when rate limit messages are detected.
 */
export class RateLimitMonitor extends Context.Tag("RateLimitMonitor")<
  RateLimitMonitor,
  IRateLimitMonitor
>() {
  static Live = Layer.effect(this, makeRateLimitMonitor);
}
