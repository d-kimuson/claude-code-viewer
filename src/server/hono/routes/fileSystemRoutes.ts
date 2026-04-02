import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { z } from "zod";
import { FileSystemController } from "../../core/file-system/presentation/FileSystemController.ts";
import { effectToResponse } from "../../lib/effect/toEffectResponse.ts";
import type { HonoContext } from "../app.ts";

const fileSystemRoutes = Effect.gen(function* () {
  const fileSystemController = yield* FileSystemController;

  return new Hono<HonoContext>()
    .get(
      "/file-completion",
      zValidator(
        "query",
        z.object({
          projectId: z.string(),
          basePath: z.string().optional().default("/"),
        }),
      ),
      async (c) => {
        const response = await effectToResponse(
          c,
          fileSystemController.getFileCompletionRoute({
            ...c.req.valid("query"),
          }),
        );

        return response;
      },
    )
    .get(
      "/directory-browser",
      zValidator(
        "query",
        z.object({
          currentPath: z.string().optional(),
          showHidden: z
            .string()
            .optional()
            .transform((val) => val === "true"),
        }),
      ),
      async (c) => {
        const response = await effectToResponse(
          c,
          fileSystemController.getDirectoryListingRoute({
            ...c.req.valid("query"),
          }),
        );
        return response;
      },
    );
});

export { fileSystemRoutes };
