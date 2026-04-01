import { Context, Effect, Layer, Ref, Schedule } from "effect";
import { EventBus } from "../core/events/services/EventBus";
import { FileWatcherService } from "../core/events/services/fileWatcher";
import type { InternalEventDeclaration } from "../core/events/types/InternalEventDeclaration";
import { ProjectMetaService } from "../core/project/services/ProjectMetaService";
import { RateLimitAutoScheduleService } from "../core/rate-limit/services/RateLimitAutoScheduleService";
import { SessionMetaService } from "../core/session/services/SessionMetaService";
import { SyncService } from "../core/sync/services/SyncService";

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
      const syncService = yield* SyncService;

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
          console.log("Starting fullSync...");
          yield* syncService.fullSync().pipe(
            Effect.catchAll((e) => {
              console.error("[InitializeService] fullSync failed:", e);
              return Effect.void;
            }),
          );
          console.log("fullSync completed");

          // ファイルウォッチャーを開始
          yield* fileWatcher.startWatching();

          // Rate limit auto-schedule service を開始
          yield* rateLimitAutoScheduleService.start();

          // ハートビートを定期的に送信
          const daemon = Effect.repeat(
            eventBus.emit("heartbeat", {}),
            Schedule.fixed("10 seconds"),
          );

          console.log("start heartbeat");
          yield* Effect.forkDaemon(daemon);
          console.log("after starting heartbeat fork");

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
                  console.error("[InitializeService] syncProjectList failed:", e);
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
