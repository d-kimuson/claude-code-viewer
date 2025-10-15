import { type FSWatcher, watch } from "node:fs";
import { Context, Effect, Layer, Ref } from "effect";
import z from "zod";
import { claudeProjectsDirPath } from "../paths";
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
      const eventBus = yield* EventBus;
      const isWatchingRef = yield* Ref.make(false);
      const watcherRef = yield* Ref.make<FSWatcher | null>(null);
      const projectWatchersRef = yield* Ref.make<Map<string, FSWatcher>>(
        new Map(),
      );

      const startWatching = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          const isWatching = yield* Ref.get(isWatchingRef);
          if (isWatching) return;

          yield* Ref.set(isWatchingRef, true);

          yield* Effect.tryPromise({
            try: async () => {
              console.log("Starting file watcher on:", claudeProjectsDirPath);
              const watcher = watch(
                claudeProjectsDirPath,
                { persistent: false, recursive: true },
                (_eventType, filename) => {
                  if (!filename) return;

                  const groups = fileRegExpGroupSchema.safeParse(
                    filename.match(fileRegExp)?.groups,
                  );

                  if (!groups.success) return;

                  const { projectId, sessionId } = groups.data;

                  Effect.runFork(
                    eventBus.emit("sessionChanged", {
                      projectId,
                      sessionId,
                    }),
                  );

                  Effect.runFork(
                    eventBus.emit("sessionListChanged", {
                      projectId,
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
