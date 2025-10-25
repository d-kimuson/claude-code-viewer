import { Effect, Layer } from "effect";
import {
  type IPersistentService,
  PersistentService,
} from "../../lib/storage/FileCacheStorage/PersistentService";

export const testPersistentServiceLayer = (options?: {
  savedEntries?: readonly [string, unknown][];
  save?: IPersistentService["save"];
}) => {
  const { savedEntries = [], save = () => Effect.void } = options ?? {};

  return Layer.mock(PersistentService, {
    load: () => Effect.succeed([...savedEntries]),
    save: save,
  });
};
