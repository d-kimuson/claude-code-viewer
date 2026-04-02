import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Fiber, Layer, Ref, Stream } from "effect";
import { ApplicationContext } from "../../platform/services/ApplicationContext.ts";
import { encodeProjectIdFromSessionFilePath } from "../../project/functions/id.ts";
import { parseSessionFilePath } from "../functions/parseSessionFilePath.ts";
import { EventBus } from "./EventBus.ts";

type FileWatcherServiceInterface = {
  readonly startWatching: () => Effect.Effect<void>;
  readonly stop: () => Effect.Effect<void>;
};

export class FileWatcherService extends Context.Tag("FileWatcherService")<
  FileWatcherService,
  FileWatcherServiceInterface
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const eventBus = yield* EventBus;
      const context = yield* ApplicationContext;

      const isWatchingRef = yield* Ref.make(false);
      const watcherFiberRef = yield* Ref.make<Fiber.RuntimeFiber<void, unknown> | null>(null);
      const debounceTimersRef = yield* Ref.make<Map<string, ReturnType<typeof setTimeout>>>(
        new Map(),
      );

      const clearDebounceTimer = (debounceKey: string) =>
        Effect.gen(function* () {
          const timers = yield* Ref.get(debounceTimersRef);
          const timer = timers.get(debounceKey);
          if (timer !== undefined) {
            clearTimeout(timer);
            timers.delete(debounceKey);
            yield* Ref.set(debounceTimersRef, timers);
          }
        });

      const scheduleDebouncedEmit = (
        debounceKey: string,
        payload:
          | { type: "agent"; projectId: string; agentSessionId: string }
          | { type: "session"; projectId: string; sessionId: string },
      ) =>
        Effect.gen(function* () {
          yield* clearDebounceTimer(debounceKey);

          const timers = yield* Ref.get(debounceTimersRef);
          const timer = setTimeout(() => {
            if (payload.type === "agent") {
              Effect.runFork(
                eventBus.emit("agentSessionChanged", {
                  projectId: payload.projectId,
                  agentSessionId: payload.agentSessionId,
                }),
              );
            } else {
              Effect.runFork(
                eventBus.emit("sessionChanged", {
                  projectId: payload.projectId,
                  sessionId: payload.sessionId,
                }),
              );
              Effect.runFork(
                eventBus.emit("sessionListChanged", {
                  projectId: payload.projectId,
                }),
              );
            }

            void Effect.runPromise(clearDebounceTimer(debounceKey));
          }, 100);

          timers.set(debounceKey, timer);
          yield* Ref.set(debounceTimersRef, timers);
        });

      const handleWatchEvent = (claudeProjectsDirPath: string, changedPath: string) =>
        Effect.gen(function* () {
          const relativePath = changedPath.startsWith(claudeProjectsDirPath)
            ? path.relative(claudeProjectsDirPath, changedPath)
            : changedPath;
          const parsed = parseSessionFilePath(relativePath);
          if (parsed === null) {
            return;
          }

          const fullPath = path.isAbsolute(changedPath)
            ? changedPath
            : path.join(claudeProjectsDirPath, changedPath);
          const encodedProjectId = encodeProjectIdFromSessionFilePath(fullPath);

          if (parsed.type === "agent") {
            const debounceKey = `${encodedProjectId}/agent-${parsed.agentSessionId}`;
            yield* scheduleDebouncedEmit(debounceKey, {
              type: "agent",
              projectId: encodedProjectId,
              agentSessionId: parsed.agentSessionId,
            });
            return;
          }

          const debounceKey = `${encodedProjectId}/${parsed.sessionId}`;
          yield* scheduleDebouncedEmit(debounceKey, {
            type: "session",
            projectId: encodedProjectId,
            sessionId: parsed.sessionId,
          });
        });

      const startWatching = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          const isWatching = yield* Ref.get(isWatchingRef);
          if (isWatching) {
            return;
          }

          const claudeCodePaths = yield* context.claudeCodePaths;
          const claudeProjectsDirPath = claudeCodePaths.claudeProjectsDirPath;

          yield* Effect.logInfo(`Starting file watcher on: ${claudeProjectsDirPath}`);

          const watcherFiber = yield* fs.watch(claudeProjectsDirPath, { recursive: true }).pipe(
            Stream.runForEach((event) => handleWatchEvent(claudeProjectsDirPath, event.path)),
            Effect.forkDaemon,
          );

          yield* Ref.set(watcherFiberRef, watcherFiber);
          yield* Ref.set(isWatchingRef, true);
          yield* Effect.logInfo("File watcher initialization completed");
        }).pipe(
          Effect.catchAll((error) => {
            Effect.runFork(Effect.logError(`Failed to start file watching: ${String(error)}`));
            return Effect.void;
          }),
        );

      const stop = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          const timers = yield* Ref.get(debounceTimersRef);
          for (const timer of timers.values()) {
            clearTimeout(timer);
          }
          yield* Ref.set(debounceTimersRef, new Map());

          const watcherFiber = yield* Ref.get(watcherFiberRef);
          if (watcherFiber !== null) {
            yield* Fiber.interrupt(watcherFiber);
            yield* Ref.set(watcherFiberRef, null);
          }

          yield* Ref.set(isWatchingRef, false);
        });

      return {
        startWatching,
        stop,
      } satisfies FileWatcherServiceInterface;
    }),
  );
}
