import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Ref, Schedule } from "effect";
import { ClaudeCodeLifeCycleService } from "../core/claude-code/services/ClaudeCodeLifeCycleService.ts";
import { EventBus } from "../core/events/services/EventBus.ts";
import { FileWatcherService } from "../core/events/services/fileWatcher.ts";
import type { InternalEventDeclaration } from "../core/events/types/InternalEventDeclaration.ts";
import { ProjectRepository } from "../core/project/infrastructure/ProjectRepository.ts";
import { ProjectMetaService } from "../core/project/services/ProjectMetaService.ts";
import { RateLimitAutoScheduleService } from "../core/rate-limit/services/RateLimitAutoScheduleService.ts";
import { SchedulerConfigBaseDir } from "../core/scheduler/config.ts";
import { SchedulerService } from "../core/scheduler/domain/Scheduler.ts";
import { SessionMetaService } from "../core/session/services/SessionMetaService.ts";
import { SyncService } from "../core/sync/services/SyncService.ts";

type InitializeServiceInterface = {
  readonly startInitialization: () => Effect.Effect<void>;
  readonly stopCleanup: () => Effect.Effect<void>;
};

export class InitializeService extends Context.Tag("InitializeService")<
  InitializeService,
  InitializeServiceInterface
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const eventBus = yield* EventBus;
      const fileWatcher = yield* FileWatcherService;
      const projectMetaService = yield* ProjectMetaService;
      const sessionMetaService = yield* SessionMetaService;
      const rateLimitAutoScheduleService = yield* RateLimitAutoScheduleService;
      const schedulerService = yield* SchedulerService;
      const syncService = yield* SyncService;

      // Capture dependencies for startScheduler (which requires runtime services)
      const fs = yield* FileSystem.FileSystem;
      const pathService = yield* Path.Path;
      const schedulerConfigBaseDir = yield* SchedulerConfigBaseDir;
      const lifeCycleService = yield* ClaudeCodeLifeCycleService;
      const projectRepository = yield* ProjectRepository;
      const schedulerRuntimeLayer = Layer.mergeAll(
        Layer.succeed(FileSystem.FileSystem, fs),
        Layer.succeed(Path.Path, pathService),
        Layer.succeed(SchedulerConfigBaseDir, schedulerConfigBaseDir),
        Layer.succeed(ClaudeCodeLifeCycleService, lifeCycleService),
        Layer.succeed(ProjectRepository, projectRepository),
      );

      // 状態管理用の Ref
      const listenersRef = yield* Ref.make<{
        sessionChanged?: ((event: InternalEventDeclaration["sessionChanged"]) => void) | null;
        sessionListChanged?:
          | ((event: InternalEventDeclaration["sessionListChanged"]) => void)
          | null;
      }>({});

      const startInitialization = (): Effect.Effect<void> => {
        return Effect.gen(function* () {
          // Run full sync to populate SQLite cache
          yield* Effect.logInfo("Starting fullSync...");
          yield* syncService.fullSync().pipe(
            Effect.catchAll((e) => {
              Effect.runFork(Effect.logError(`[InitializeService] fullSync failed: ${String(e)}`));
              return Effect.void;
            }),
          );
          yield* Effect.logInfo("fullSync completed");

          // ファイルウォッチャーを開始
          yield* fileWatcher.startWatching();

          // Start all enabled scheduled jobs
          yield* schedulerService.startScheduler.pipe(
            Effect.provide(schedulerRuntimeLayer),
            Effect.catchAll((error) => {
              Effect.runFork(
                Effect.logError(`[InitializeService] startScheduler failed: ${String(error)}`),
              );
              return Effect.void;
            }),
          );

          // Rate limit auto-schedule service を開始
          yield* rateLimitAutoScheduleService.start();

          // ハートビートを定期的に送信
          const daemon = Effect.repeat(
            eventBus.emit("heartbeat", {}),
            Schedule.fixed("10 seconds"),
          );

          yield* Effect.logInfo("start heartbeat");
          yield* Effect.forkDaemon(daemon);
          yield* Effect.logInfo("after starting heartbeat fork");

          // sessionChanged イベントのリスナーを登録
          const onSessionChanged = (event: InternalEventDeclaration["sessionChanged"]) => {
            Effect.runFork(projectMetaService.invalidateProject(event.projectId));

            Effect.runFork(sessionMetaService.invalidateSession(event.projectId, event.sessionId));
          };

          // sessionListChanged イベントのリスナーを登録
          const onSessionListChanged = (event: InternalEventDeclaration["sessionListChanged"]) => {
            Effect.runFork(
              syncService.syncProjectList(event.projectId).pipe(
                Effect.catchAll((e) => {
                  Effect.runFork(
                    Effect.logError(`[InitializeService] syncProjectList failed: ${String(e)}`),
                  );
                  return Effect.void;
                }),
              ),
            );
          };

          yield* Ref.set(listenersRef, {
            sessionChanged: onSessionChanged,
            sessionListChanged: onSessionListChanged,
          });
          yield* eventBus.on("sessionChanged", onSessionChanged);
          yield* eventBus.on("sessionListChanged", onSessionListChanged);
        }).pipe(Effect.withSpan("start-initialization"));
      };

      const stopCleanup = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          const listeners = yield* Ref.get(listenersRef);
          if (listeners.sessionChanged) {
            yield* eventBus.off("sessionChanged", listeners.sessionChanged);
          }
          if (listeners.sessionListChanged) {
            yield* eventBus.off("sessionListChanged", listeners.sessionListChanged);
          }

          yield* Ref.set(listenersRef, {});
          yield* schedulerService.stopScheduler.pipe(
            Effect.catchAll((error) => {
              Effect.runFork(
                Effect.logError(`[InitializeService] stopScheduler failed: ${String(error)}`),
              );
              return Effect.void;
            }),
          );
          yield* rateLimitAutoScheduleService.stop();
          yield* fileWatcher.stop();
        });

      return {
        startInitialization,
        stopCleanup,
      } satisfies InitializeServiceInterface;
    }),
  );
}
