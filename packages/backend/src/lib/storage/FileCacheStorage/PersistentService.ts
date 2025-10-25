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
        const parsed = (() => {
          try {
            return saveSchema.parse(JSON.parse(content));
          } catch (error) {
            console.error(`Cache file parse error: ${error}`);
            return undefined;
          }
        })();

        if (parsed === undefined || parsed.length === 0) {
          console.error(`Cache file removed: ${cacheFilePath}`);
          yield* fs.writeFileString(cacheFilePath, "[]");
        } else {
          return parsed;
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
