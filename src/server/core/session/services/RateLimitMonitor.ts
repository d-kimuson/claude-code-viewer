import { Context, Effect, Layer, Ref } from "effect";
import { EventBus } from "../../events/services/EventBus";
import type { InternalEventDeclaration } from "../../events/types/InternalEventDeclaration";
import { UserConfigService } from "../../platform/services/UserConfigService";
import {
  type CreateRateLimitResumeJobParams,
  createRateLimitResumeJob,
} from "../functions/createRateLimitResumeJob";
import { parseRateLimitMessage } from "../functions/parseRateLimitMessage";
import { SessionRepository } from "../infrastructure/SessionRepository";

/**
 * Function type for creating rate limit resume jobs.
 * Used in tests to replace the actual implementation with mocks.
 * @internal
 */
type CreateResumeJobFn = (
  params: CreateRateLimitResumeJobParams,
  // biome-ignore lint/suspicious/noExplicitAny: Flexible return type for mocks and real implementation
) => any;

/**
 * Service that monitors session changes and automatically creates
 * resume jobs when rate limit messages are detected.
 */
interface RateLimitMonitorInterface {
  /**
   * Start monitoring session changes for rate limit messages.
   */
  readonly startMonitoring: () => Effect.Effect<void>;

  /**
   * Stop monitoring session changes.
   */
  readonly stopMonitoring: () => Effect.Effect<void>;

  /**
   * Internal method for testing: replace createRateLimitResumeJob with a mock.
   * @internal
   */
  readonly _setCreateResumeJob: (fn: CreateResumeJobFn) => void;
}

export class RateLimitMonitor extends Context.Tag("RateLimitMonitor")<
  RateLimitMonitor,
  RateLimitMonitorInterface
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const eventBus = yield* EventBus;
      const sessionRepository = yield* SessionRepository;
      const userConfigService = yield* UserConfigService;

      // Listener reference for cleanup
      const listenerRef = yield* Ref.make<
        ((event: InternalEventDeclaration["sessionChanged"]) => void) | null
      >(null);

      // For testing: allow replacing createRateLimitResumeJob
      // In production, this ref holds the actual createRateLimitResumeJob function
      // In tests, it's replaced with a mock via _setCreateResumeJob
      const createResumeJobRef = yield* Ref.make<CreateResumeJobFn>(
        createRateLimitResumeJob,
      );

      /**
       * Handle sessionChanged event by checking for rate limit messages
       * and creating resume jobs if needed.
       */
      const handleSessionChanged = (
        event: InternalEventDeclaration["sessionChanged"],
      ): Effect.Effect<void> => {
        return Effect.gen(function* () {
          const { projectId, sessionId } = event;

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
          // Get the function from ref and call it
          // The function returns an Effect which may have dependencies,
          // but those will be provided by the runtime context
          yield* Effect.gen(function* () {
            const createResumeJob = yield* Ref.get(createResumeJobRef);
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic function call with flexible typing
            const resumeJobEffect: any = createResumeJob({
              entry: lastConversation,
              sessionId,
              projectId,
              autoResumeEnabled: userConfig.autoResumeOnRateLimit ?? false,
            });
            // Execute and ignore result/errors
            yield* Effect.ignore(resumeJobEffect);
          }).pipe(
            // Catch all errors to prevent monitoring from crashing
            Effect.catchAll(() => Effect.void),
            // Explicitly type as void effect with no deps
            Effect.withSpan("create-rate-limit-resume-job"),
          );
        }) as Effect.Effect<void>;
      };

      const startMonitoring = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          const currentListener = yield* Ref.get(listenerRef);
          if (currentListener) {
            // Already monitoring
            return;
          }

          // Create listener for sessionChanged events
          const listener = (
            event: InternalEventDeclaration["sessionChanged"],
          ) => {
            Effect.runFork(
              handleSessionChanged(event).pipe(
                // Catch all errors to prevent crashing
                Effect.catchAll(() => Effect.void),
              ),
            );
          };

          // Subscribe to sessionChanged events
          yield* eventBus.on("sessionChanged", listener);

          yield* Ref.set(listenerRef, listener);
        });

      const stopMonitoring = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          const currentListener = yield* Ref.get(listenerRef);
          if (currentListener) {
            yield* eventBus.off("sessionChanged", currentListener);
            yield* Ref.set(listenerRef, null);
          }
        });

      const _setCreateResumeJob = (fn: CreateResumeJobFn): void => {
        Effect.runSync(Ref.set(createResumeJobRef, fn));
      };

      return {
        startMonitoring,
        stopMonitoring,
        _setCreateResumeJob,
      } satisfies RateLimitMonitorInterface;
    }),
  );
}
