import type { FileSystem } from "@effect/platform";
import { Context, Effect, Layer, Ref, Runtime } from "effect";
import type { z } from "zod";
import { PersistentService } from "./PersistentService";

export interface FileCacheStorageService<T> {
  readonly get: (key: string) => Effect.Effect<T | undefined>;
  readonly set: (key: string, value: T) => Effect.Effect<void>;
  readonly invalidate: (key: string) => Effect.Effect<void>;
  readonly getAll: () => Effect.Effect<Map<string, T>>;
}

export const FileCacheStorage = <T>() =>
  Context.GenericTag<FileCacheStorageService<T>>("FileCacheStorage");

export const makeFileCacheStorageLayer = <T>(
  storageKey: string,
  schema: z.ZodType<T>,
) =>
  Layer.effect(
    FileCacheStorage<T>(),
    Effect.gen(function* () {
      const persistentService = yield* PersistentService;

      const runtime = yield* Effect.runtime<FileSystem.FileSystem>();

      const storageRef = yield* Effect.gen(function* () {
        const persistedData = yield* persistentService.load(storageKey);

        const initialMap = new Map<string, T>();
        for (const [key, value] of persistedData) {
          const parsed = schema.safeParse(value);
          if (parsed.success) {
            initialMap.set(key, parsed.data);
          }
        }

        return yield* Ref.make(initialMap);
      });

      const syncToFile = (entries: readonly [string, T][]) => {
        Runtime.runFork(runtime)(persistentService.save(storageKey, entries));
      };

      return {
        get: (key: string) =>
          Effect.gen(function* () {
            const storage = yield* Ref.get(storageRef);
            return storage.get(key);
          }),

        set: (key: string, value: T) =>
          Effect.gen(function* () {
            const before = yield* Ref.get(storageRef);
            const beforeString = JSON.stringify(Array.from(before.entries()));

            yield* Ref.update(storageRef, (map) => {
              map.set(key, value);
              return map;
            });

            const after = yield* Ref.get(storageRef);
            const afterString = JSON.stringify(Array.from(after.entries()));

            if (beforeString !== afterString) {
              syncToFile(Array.from(after.entries()));
            }
          }),

        invalidate: (key: string) =>
          Effect.gen(function* () {
            const before = yield* Ref.get(storageRef);

            if (!before.has(key)) {
              return;
            }

            yield* Ref.update(storageRef, (map) => {
              map.delete(key);
              return map;
            });

            const after = yield* Ref.get(storageRef);
            syncToFile(Array.from(after.entries()));
          }),

        getAll: () =>
          Effect.gen(function* () {
            const storage = yield* Ref.get(storageRef);
            return new Map(storage);
          }),
      };
    }),
  );
