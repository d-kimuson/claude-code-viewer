import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import {
  defaultSidebarLayout,
  sidebarLayoutSchema,
  type SidebarLayout,
} from "../../../../lib/sidebar-layout/schema";
export const SidebarLayoutRepository = (baseDir: string) => ({
  read: () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const file = path.join(baseDir, "sidebar-layout.json");
      if (!(yield* fs.exists(file))) return defaultSidebarLayout();
      const content = yield* fs.readFileString(file);
      return yield* Effect.try({
        try: () => sidebarLayoutSchema.parse(JSON.parse(content)),
        catch: (cause) => new Error(`Invalid sidebar layout: ${String(cause)}`),
      });
    }),
  write: (layout: SidebarLayout) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      yield* fs.makeDirectory(baseDir, { recursive: true });
      const file = path.join(baseDir, "sidebar-layout.json");
      const suffix = yield* Effect.sync(() => crypto.randomUUID());
      const temp = `${file}.${suffix}.tmp`;
      yield* fs.writeFileString(temp, JSON.stringify(layout, null, 2));
      yield* fs.rename(temp, file);
      return layout;
    }),
});
