import { FileSystem, Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { expect, test } from "vitest";
import { defaultSidebarLayout } from "../../../../lib/sidebar-layout/schema";
import { SidebarLayoutRepository } from "./SidebarLayoutRepository";
const run = <A, E>(effect: Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(Path.layer),
      Effect.provide(FileSystem.layerNoop({ exists: () => Effect.succeed(false) })),
    ),
  );
test("missing file returns initial state", async () => {
  expect(await run(SidebarLayoutRepository("/test").read())).toEqual(defaultSidebarLayout());
});
test("reads valid layout and rejects corrupt or invalid JSON without writing", async () => {
  for (const content of [JSON.stringify(defaultSidebarLayout()), "{broken", '{"version":2}']) {
    const writes: string[] = [];
    const layer = Layer.merge(
      Path.layer,
      FileSystem.layerNoop({
        exists: () => Effect.succeed(true),
        readFileString: () => Effect.succeed(content),
        writeFileString: (path) =>
          Effect.sync(() => {
            writes.push(path);
          }),
      }),
    );
    const result = await Effect.runPromise(
      Effect.either(SidebarLayoutRepository("/test").read()).pipe(Effect.provide(layer)),
    );
    expect(result._tag).toBe(content.startsWith('{"version":1') ? "Right" : "Left");
    expect(writes).toEqual([]);
  }
});
test("writes a temporary file in the same directory before rename", async () => {
  const operations: string[] = [];
  const layer = Layer.merge(
    Path.layer,
    FileSystem.layerNoop({
      makeDirectory: () => Effect.void,
      writeFileString: (path) =>
        Effect.sync(() => {
          operations.push(path);
        }),
      rename: (from, to) =>
        Effect.sync(() => {
          operations.push(from, to);
        }),
    }),
  );
  await Effect.runPromise(
    SidebarLayoutRepository("/test").write(defaultSidebarLayout()).pipe(Effect.provide(layer)),
  );
  expect(operations[0]).toMatch(/^\/test\/sidebar-layout.json\..*\.tmp$/);
  expect(operations[1]).toBe(operations[0]);
  expect(operations[2]).toBe("/test/sidebar-layout.json");
});

test("round trips layout through the filesystem", async () => {
  const { NodeContext } = await import("@effect/platform-node");
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const directory = yield* fs.makeTempDirectoryScoped();
        const repository = SidebarLayoutRepository(directory);
        const layout = {
          ...defaultSidebarLayout(),
          order: ["D:\\Shop"],
          hidden: ["/private/tmp"],
          expanded: ["/app"],
        };
        yield* repository.write(layout);
        expect(yield* repository.read()).toEqual(layout);
        const files = yield* fs.readDirectory(directory);
        expect(files).toEqual(["sidebar-layout.json"]);
      }),
    ).pipe(Effect.provide(NodeContext.layer)),
  );
});
