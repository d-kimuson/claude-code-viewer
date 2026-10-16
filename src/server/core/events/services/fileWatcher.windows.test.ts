import { NodePath } from "@effect/platform-node";
import * as FileSystem from "@effect/platform/FileSystem";
import { Deferred, Effect, Layer, Stream } from "effect";
import { describe, expect, test } from "vitest";
import { testFileSystemLayer } from "../../../../testing/layers/testFileSystemLayer.ts";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import { encodeProjectId } from "../../project/functions/id.ts";
import { EventBus } from "./EventBus.ts";
import { FileWatcherService } from "./fileWatcher.ts";

const claudeDir = "C:\\synthetic-home\\.claude";
const projectsDir = `${claudeDir}\\projects`;
const projectDir = `${projectsDir}\\synthetic-project`;
const platformLayer = Layer.merge(
  testPlatformLayer({
    claudeCodePaths: {
      globalClaudeDirectoryPath: claudeDir,
      claudeProjectsDirPath: projectsDir,
      claudeCommandsDirPath: `${claudeDir}\\commands`,
      claudeSkillsDirPath: `${claudeDir}\\skills`,
      claudeAgentsDirPath: `${claudeDir}\\agents`,
    },
  }),
  NodePath.layerWin32,
);

describe("Windows file watcher events", () => {
  for (const absolute of [false, true]) {
    test(`regular session update preserves the repository project ID (${absolute ? "absolute" : "relative"} path)`, async () => {
      const relativePath = "synthetic-project\\session-id.jsonl";
      const changedPath = absolute ? `${projectsDir}\\${relativePath}` : relativePath;
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const watcher = yield* FileWatcherService;
          const eventBus = yield* EventBus;
          const received = yield* Deferred.make<{ projectId: string; sessionId: string }>();
          yield* eventBus.on("sessionChanged", (event) => {
            Effect.runFork(Deferred.succeed(received, event));
          });
          yield* watcher.startWatching();
          return yield* Deferred.await(received).pipe(
            Effect.timeout("1 second"),
            Effect.ensuring(watcher.stop()),
          );
        }).pipe(
          Effect.provide(FileWatcherService.Live),
          Effect.provide(
            testFileSystemLayer({
              watch: () => Stream.make(FileSystem.WatchEventUpdate({ path: changedPath })),
            }),
          ),
          Effect.provide(platformLayer),
        ),
      );
      expect(result).toEqual({ projectId: encodeProjectId(projectDir), sessionId: "session-id" });
    });

    test(`agent update preserves the repository project ID (${absolute ? "absolute" : "relative"} path)`, async () => {
      const relativePath = "synthetic-project\\agent-example.jsonl";
      const changedPath = absolute ? `${projectsDir}\\${relativePath}` : relativePath;
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const watcher = yield* FileWatcherService;
          const eventBus = yield* EventBus;
          const received = yield* Deferred.make<{ projectId: string; agentSessionId: string }>();
          yield* eventBus.on("agentSessionChanged", (event) => {
            Effect.runFork(Deferred.succeed(received, event));
          });
          yield* watcher.startWatching();
          return yield* Deferred.await(received).pipe(
            Effect.timeout("1 second"),
            Effect.ensuring(watcher.stop()),
          );
        }).pipe(
          Effect.provide(FileWatcherService.Live),
          Effect.provide(
            testFileSystemLayer({
              watch: () => Stream.make(FileSystem.WatchEventUpdate({ path: changedPath })),
            }),
          ),
          Effect.provide(platformLayer),
        ),
      );
      expect(result).toEqual({ projectId: encodeProjectId(projectDir), agentSessionId: "example" });
    });
  }
});
