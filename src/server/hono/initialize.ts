import { Context, Effect, Layer, Ref, Schedule } from "effect";
import { EventBus } from "../core/events/services/EventBus";
import { FileWatcherService } from "../core/events/services/fileWatcher";
import type { InternalEventDeclaration } from "../core/events/types/InternalEventDeclaration";
import { ProjectRepository } from "../core/project/infrastructure/ProjectRepository";
import { ProjectMetaService } from "../core/project/services/ProjectMetaService";
import { SessionRepository } from "../core/session/infrastructure/SessionRepository";
import { VirtualConversationDatabase } from "../core/session/infrastructure/VirtualConversationDatabase";
import { SessionMetaService } from "../core/session/services/SessionMetaService";

interface InitializeServiceInterface {
  readonly startInitialization: () => Effect.Effect<void>;
  readonly stopCleanup: () => Effect.Effect<void>;
}

export class InitializeService extends Context.Tag("InitializeService")<
  InitializeService,
  InitializeServiceInterface
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const eventBus = yield* EventBus;
      const fileWatcher = yield* FileWatcherService;
      const projectRepository = yield* ProjectRepository;
      const sessionRepository = yield* SessionRepository;
      const projectMetaService = yield* ProjectMetaService;
      const sessionMetaService = yield* SessionMetaService;
      const virtualConversationDatabase = yield* VirtualConversationDatabase;

      // 状態管理用の Ref
      const listenersRef = yield* Ref.make<{
        sessionProcessChanged?:
          | ((event: InternalEventDeclaration["sessionProcessChanged"]) => void)
          | null;
        sessionChanged?:
          | ((event: InternalEventDeclaration["sessionChanged"]) => void)
          | null;
      }>({});

      const startInitialization = (): Effect.Effect<void> => {
        return Effect.gen(function* () {
          // ファイルウォッチャーを開始
          yield* fileWatcher.startWatching();

          // ハートビートを定期的に送信
          const daemon = Effect.repeat(
            eventBus.emit("heartbeat", {}),
            Schedule.fixed("10 seconds"),
          );

          console.log("start heartbeat");
          yield* Effect.forkDaemon(daemon);
          console.log("after starting heartbeat fork");

          // sessionChanged イベントのリスナーを登録
          const onSessionChanged = (
            event: InternalEventDeclaration["sessionChanged"],
          ) => {
            Effect.runFork(
              projectMetaService.invalidateProject(event.projectId),
            );

            Effect.runFork(
              sessionMetaService.invalidateSession(
                event.projectId,
                event.sessionId,
              ),
            );
          };

          const onSessionProcessChanged = (
            event: InternalEventDeclaration["sessionProcessChanged"],
          ) => {
            if (
              (event.changed.type === "completed" ||
                event.changed.type === "paused") &&
              event.changed.sessionId !== undefined
            ) {
              Effect.runFork(
                virtualConversationDatabase.deleteVirtualConversations(
                  event.changed.sessionId,
                ),
              );
              return;
            }
          };

          yield* Ref.set(listenersRef, {
            sessionChanged: onSessionChanged,
            sessionProcessChanged: onSessionProcessChanged,
          });
          yield* eventBus.on("sessionChanged", onSessionChanged);
          yield* eventBus.on("sessionProcessChanged", onSessionProcessChanged);

          yield* Effect.gen(function* () {
            console.log("Initializing projects cache");
            const { projects } = yield* projectRepository.getProjects();
            console.log(`${projects.length} projects cache initialized`);

            console.log("Initializing sessions cache");
            const results = yield* Effect.all(
              projects.map((project) =>
                sessionRepository.getSessions(project.id),
              ),
              { concurrency: "unbounded" },
            );
            const totalSessions = results.reduce(
              (s, { sessions }) => s + sessions.length,
              0,
            );
            console.log(`${totalSessions} sessions cache initialized`);
          }).pipe(
            Effect.catchAll(() => Effect.void),
            Effect.withSpan("initialize-cache"),
          );
        }).pipe(Effect.withSpan("start-initialization")) as Effect.Effect<void>;
      };

      const stopCleanup = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          const listeners = yield* Ref.get(listenersRef);
          if (listeners.sessionChanged) {
            yield* eventBus.off("sessionChanged", listeners.sessionChanged);
          }

          if (listeners.sessionProcessChanged) {
            yield* eventBus.off(
              "sessionProcessChanged",
              listeners.sessionProcessChanged,
            );
          }

          yield* Ref.set(listenersRef, {});
          yield* fileWatcher.stop();
        });

      return {
        startInitialization,
        stopCleanup,
      } satisfies InitializeServiceInterface;
    }),
  );
}
