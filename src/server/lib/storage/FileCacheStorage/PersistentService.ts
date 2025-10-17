import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import { claudeCodeViewerCacheDirPath } from "../../config/paths";
import type { InferEffect } from "../../effect/types";

const saveSchema = z.array(z.tuple([z.string(), z.unknown()]));

const LayerImpl = Effect.gen(function* () {
  const path = yield* Path.Path;

  const getCacheFilePath = (key: string) =>
    path.resolve(claudeCodeViewerCacheDirPath, `${key}.json`);

  const load = (key: string) => {
    const cacheFilePath = getCacheFilePath(key);

    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      if (!(yield* fs.exists(claudeCodeViewerCacheDirPath))) {
        yield* fs.makeDirectory(claudeCodeViewerCacheDirPath, {
          recursive: true,
        });
      }

      if (!(yield* fs.exists(cacheFilePath))) {
        yield* fs.writeFileString(cacheFilePath, "[]");
      } else {
        const content = yield* fs.readFileString(cacheFilePath);
        const parsed = saveSchema.safeParse(JSON.parse(content));

        if (!parsed.success) {
          yield* fs.writeFileString(cacheFilePath, "[]");
        } else {
          parsed.data;
          return parsed.data;
        }
      }

      return [];
    });
  };

  const save = (key: string, entries: readonly [string, unknown][]) => {
    const cacheFilePath = getCacheFilePath(key);

    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(cacheFilePath, JSON.stringify(entries));
    });
  };

  return {
    load,
    save,
  };
});

export type IPersistentService = InferEffect<typeof LayerImpl>;

export class PersistentService extends Context.Tag("PersistentService")<
  PersistentService,
  IPersistentService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
