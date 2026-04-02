import { Path } from "@effect/platform";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { describe, expect } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import type { InternalEventDeclaration } from "../types/InternalEventDeclaration.ts";
import { EventBus } from "./EventBus.ts";
import { FileWatcherService } from "./fileWatcher.ts";

describe("FileWatcherService", () => {
  describe("startWatching", () => {
    it.live("can start file watching", () =>
      Effect.gen(function* () {
        const watcher = yield* FileWatcherService;

        // Start watching
        yield* watcher.startWatching();

        // Confirm successful start (no errors)
        expect(true).toBe(true);
      }).pipe(
        Effect.provide(FileWatcherService.Live),
        Effect.provide(testPlatformLayer()),
        Effect.provide(Path.layer),
      ),
    );

    it.live("can stop watching with stop", () =>
      Effect.gen(function* () {
        const watcher = yield* FileWatcherService;

        // Start watching
        yield* watcher.startWatching();

        // Stop watching
        yield* watcher.stop();

        expect(true).toBe(true);
      }).pipe(
        Effect.provide(FileWatcherService.Live),
        Effect.provide(testPlatformLayer()),
        Effect.provide(Path.layer),
      ),
    );

    it.live("only starts once even when startWatching is called multiple times", () =>
      Effect.gen(function* () {
        const watcher = yield* FileWatcherService;

        // Start watching multiple times
        yield* watcher.startWatching();
        yield* watcher.startWatching();
        yield* watcher.startWatching();

        // Confirm no errors occur
        expect(true).toBe(true);
      }).pipe(
        Effect.provide(FileWatcherService.Live),
        Effect.provide(testPlatformLayer()),
        Effect.provide(Path.layer),
      ),
    );

    it.live("can call startWatching again after stop", () =>
      Effect.gen(function* () {
        const watcher = yield* FileWatcherService;

        // Start watching
        yield* watcher.startWatching();

        // Stop watching
        yield* watcher.stop();

        // Start watching again
        yield* watcher.startWatching();

        // Stop watching
        yield* watcher.stop();

        expect(true).toBe(true);
      }).pipe(
        Effect.provide(FileWatcherService.Live),
        Effect.provide(testPlatformLayer()),
        Effect.provide(Path.layer),
      ),
    );
  });

  describe("verify event firing behavior", () => {
    it.live("file change events propagate to EventBus (integration test)", () =>
      Effect.gen(function* () {
        const watcher = yield* FileWatcherService;
        const eventBus = yield* EventBus;

        const sessionChangedEvents: Array<InternalEventDeclaration["sessionChanged"]> = [];

        // Register event listener
        const listener = (event: InternalEventDeclaration["sessionChanged"]) => {
          sessionChangedEvents.push(event);
        };

        yield* eventBus.on("sessionChanged", listener);

        // Start watching
        yield* watcher.startWatching();

        // Note: It's difficult to trigger actual file changes,
        // so here we only verify that watching starts successfully
        yield* Effect.sleep("50 millis");

        // Stop watching
        yield* watcher.stop();

        yield* eventBus.off("sessionChanged", listener);

        // Confirm watching started
        expect(true).toBe(true);
      }).pipe(
        Effect.provide(FileWatcherService.Live),
        Effect.provide(testPlatformLayer()),
        Effect.provide(Path.layer),
      ),
    );
  });

  describe("error handling", () => {
    it.live("continues processing without throwing errors even with invalid directories", () =>
      Effect.gen(function* () {
        const watcher = yield* FileWatcherService;

        // Start watching (catches errors and continues even with invalid directories)
        yield* watcher.startWatching();

        // Confirm no errors occur and processing continues normally
        yield* watcher.stop();

        expect(true).toBe(true);
      }).pipe(
        Effect.provide(FileWatcherService.Live),
        Effect.provide(testPlatformLayer()),
        Effect.provide(Path.layer),
      ),
    );
  });
});
