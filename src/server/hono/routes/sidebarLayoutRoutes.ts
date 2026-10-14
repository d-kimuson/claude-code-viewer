import { type FileSystem, Path } from "@effect/platform";
import { zValidator } from "@hono/zod-validator";
import { Effect, Runtime } from "effect";
import { Hono } from "hono";
import { sidebarLayoutSchema } from "../../../lib/sidebar-layout/schema";
import { EnvService } from "../../core/platform/services/EnvService";
import { SidebarLayoutController } from "../../core/sidebar-layout/presentation/SidebarLayoutController";
import type { HonoContext } from "../app";

export const sidebarLayoutRoutes = Effect.gen(function* () {
  const env = yield* EnvService;
  const path = yield* Path.Path;
  const home = yield* env.getEnv("HOME");
  if (home === undefined)
    return yield* Effect.fail(new Error("HOME is required for sidebar layout"));
  const controller = SidebarLayoutController(path.join(home, ".claude-code-viewer"));
  const runtime = yield* Effect.runtime<FileSystem.FileSystem | Path.Path>();
  return new Hono<HonoContext>()
    .get("/", async (c) => {
      const result = await Runtime.runPromise(runtime)(Effect.either(controller.read()));
      return result._tag === "Left"
        ? c.json({ message: String(result.left) }, 500)
        : c.json(result.right, 200);
    })
    .put("/", zValidator("json", sidebarLayoutSchema), async (c) => {
      const result = await Runtime.runPromise(runtime)(
        Effect.either(controller.write(c.req.valid("json"))),
      );
      return result._tag === "Left"
        ? c.json({ message: String(result.left) }, 500)
        : c.json(result.right, 200);
    });
});
