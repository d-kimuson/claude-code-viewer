import { type FSWatcher, watch } from "node:fs";
import { Path } from "@effect/platform";
import { Context, Effect, Layer, Ref } from "effect";
import z from "zod";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import { encodeProjectIdFromSessionFilePath } from "../../project/functions/id";
import { EventBus } from "./EventBus";

const fileRegExp = /(?<projectId>.*?)\/(?<sessionId>.*?)\.jsonl/;
const fileRegExpGroupSchema = z.object({
  projectId: z.string(),
  sessionId: z.string(),
});

interface FileWatcherServiceInterface {
  readonly startWatching: () => Effect.Effect<void>;
  readonly stop: () => Effect.Effect<void>;
}

export class FileWatcherService extends Context.Tag("FileWatcherService")<
  FileWatcherService,
  FileWatcherServiceInterface
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const eventBus = yield* EventBus;
      const context = yield* ApplicationContext;

      const isWatchingRef = yield* Ref.make(false);
      const watcherRef = yield* Ref.make<FSWatcher | null>(null);
      const projectWatchersRef = yield* Ref.make<Map<string, FSWatcher>>(
        new Map(),
      );
      const debounceTimersRef = yield* Ref.make<
        Map<string, ReturnType<typeof setTimeout>>
      >(new Map());

      const startWatching = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          const isWatching = yield* Ref.get(isWatchingRef);
          if (isWatching) return;

          yield* Ref.set(isWatchingRef, true);

          yield* Effect.tryPromise({
            try: async () => {
              console.log(
                "Starting file watcher on:",
                context.claudeCodePaths.claudeProjectsDirPath,
              );

              const watcher = watch(
                context.claudeCodePaths.claudeProjectsDirPath,
                { persistent: false, recursive: true },
                (_eventType, filename) => {
                  if (!filename) return;

                  const groups = fileRegExpGroupSchema.safeParse(
                    filename.match(fileRegExp)?.groups,
                  );

                  if (!groups.success) return;

                  const { sessionId } = groups.data;

                  // フルパスを構築してエンコードされた projectId を取得
                  const fullPath = path.join(
                    context.claudeCodePaths.claudeProjectsDirPath,
                    filename,
                  );
                  const encodedProjectId =
                    encodeProjectIdFromSessionFilePath(fullPath);
                  const debounceKey = `${encodedProjectId}/${sessionId}`;

                  Effect.runPromise(
                    Effect.gen(function* () {
                      const timers = yield* Ref.get(debounceTimersRef);
                      const existingTimer = timers.get(debounceKey);
                      if (existingTimer) {
                        clearTimeout(existingTimer);
                      }

                      const newTimer = setTimeout(() => {
                        Effect.runFork(
                          eventBus.emit("sessionChanged", {
                            projectId: encodedProjectId,
                            sessionId,
                          }),
                        );

                        Effect.runFork(
                          eventBus.emit("sessionListChanged", {
                            projectId: encodedProjectId,
                          }),
                        );

                        Effect.runPromise(
                          Effect.gen(function* () {
                            const currentTimers =
                              yield* Ref.get(debounceTimersRef);
                            currentTimers.delete(debounceKey);
                            yield* Ref.set(debounceTimersRef, currentTimers);
                          }),
                        );
                      }, 300);

                      timers.set(debounceKey, newTimer);
                      yield* Ref.set(debounceTimersRef, timers);
                    }),
                  );
                },
              );

              await Effect.runPromise(Ref.set(watcherRef, watcher));
              console.log("File watcher initialization completed");
            },
            catch: (error) => {
              console.error("Failed to start file watching:", error);
              return new Error(
                `Failed to start file watching: ${String(error)}`,
              );
            },
          }).pipe(
            // エラーが発生しても続行する
            Effect.catchAll(() => Effect.void),
          );
        });

      const stop = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          const timers = yield* Ref.get(debounceTimersRef);
          for (const [, timer] of timers) {
            clearTimeout(timer);
          }
          yield* Ref.set(debounceTimersRef, new Map());

          const watcher = yield* Ref.get(watcherRef);
          if (watcher) {
            yield* Effect.sync(() => watcher.close());
            yield* Ref.set(watcherRef, null);
          }

          const projectWatchers = yield* Ref.get(projectWatchersRef);
          for (const [, projectWatcher] of projectWatchers) {
            yield* Effect.sync(() => projectWatcher.close());
          }
          yield* Ref.set(projectWatchersRef, new Map());
          yield* Ref.set(isWatchingRef, false);
        });

      return {
        startWatching,
        stop,
      } satisfies FileWatcherServiceInterface;
    }),
  );
}
