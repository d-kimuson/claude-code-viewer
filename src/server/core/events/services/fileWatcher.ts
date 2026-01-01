import { type FSWatcher, watch } from "node:fs";
import { Path } from "@effect/platform";
import { Context, Effect, Layer, Ref } from "effect";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import { encodeProjectIdFromSessionFilePath } from "../../project/functions/id";
import { parseSessionFilePath } from "../functions/parseSessionFilePath";
import { EventBus } from "./EventBus";

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

          const claudeCodePaths = yield* context.claudeCodePaths;

          yield* Ref.set(isWatchingRef, true);

          yield* Effect.tryPromise({
            try: async () => {
              console.log(
                "Starting file watcher on:",
                claudeCodePaths.claudeProjectsDirPath,
              );

              const watcher = watch(
                claudeCodePaths.claudeProjectsDirPath,
                { persistent: false, recursive: true },
                (_eventType, filename) => {
                  if (!filename) return;

                  const fileMatch = parseSessionFilePath(filename);
                  if (fileMatch === null) return;

                  // Build full path to get encoded projectId
                  const fullPath = path.join(
                    claudeCodePaths.claudeProjectsDirPath,
                    filename,
                  );
                  const encodedProjectId =
                    encodeProjectIdFromSessionFilePath(fullPath);

                  // Determine debounce key based on file type
                  const debounceKey =
                    fileMatch.type === "agent"
                      ? `${encodedProjectId}/agent-${fileMatch.agentSessionId}`
                      : `${encodedProjectId}/${fileMatch.sessionId}`;

                  Effect.runPromise(
                    Effect.gen(function* () {
                      const timers = yield* Ref.get(debounceTimersRef);
                      const existingTimer = timers.get(debounceKey);
                      if (existingTimer) {
                        clearTimeout(existingTimer);
                      }

                      const newTimer = setTimeout(() => {
                        if (fileMatch.type === "agent") {
                          // Agent session file changed
                          Effect.runFork(
                            eventBus.emit("agentSessionChanged", {
                              projectId: encodedProjectId,
                              agentSessionId: fileMatch.agentSessionId,
                            }),
                          );
                        } else {
                          // Regular session file changed
                          Effect.runFork(
                            eventBus.emit("sessionChanged", {
                              projectId: encodedProjectId,
                              sessionId: fileMatch.sessionId,
                            }),
                          );

                          Effect.runFork(
                            eventBus.emit("sessionListChanged", {
                              projectId: encodedProjectId,
                            }),
                          );
                        }

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
