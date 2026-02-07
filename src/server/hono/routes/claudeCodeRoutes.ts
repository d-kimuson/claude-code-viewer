import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { z } from "zod";
import type { UserMessageInput } from "../../core/claude-code/functions/createMessageGenerator";
import { ClaudeCodeController } from "../../core/claude-code/presentation/ClaudeCodeController";
import { ClaudeCodePermissionController } from "../../core/claude-code/presentation/ClaudeCodePermissionController";
import { ClaudeCodeSessionProcessController } from "../../core/claude-code/presentation/ClaudeCodeSessionProcessController";
import {
  ccOptionsSchema,
  userMessageInputSchema,
} from "../../core/claude-code/schema";
import { ClaudeCodeLifeCycleService } from "../../core/claude-code/services/ClaudeCodeLifeCycleService";
import { effectToResponse } from "../../lib/effect/toEffectResponse";
import type { HonoContext } from "../app";
import { getHonoRuntime } from "../runtime";

const normalizeUserMessageInput = (
  input: z.infer<typeof userMessageInputSchema>,
): UserMessageInput => {
  const images = input.images?.map((image) => ({
    type: image.type,
    source: image.source,
  }));
  const documents = input.documents?.map((document) => {
    if (!document.source) {
      throw new Error("Document source is required");
    }

    return {
      type: document.type,
      source: document.source,
    };
  });

  return {
    text: input.text,
    images,
    documents,
  };
};

const claudeCodeRoutes = Effect.gen(function* () {
  const claudeCodeController = yield* ClaudeCodeController;
  const claudeCodeSessionProcessController =
    yield* ClaudeCodeSessionProcessController;
  const claudeCodePermissionController = yield* ClaudeCodePermissionController;
  const claudeCodeLifeCycleService = yield* ClaudeCodeLifeCycleService;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>()
    .get("/meta", async (c) => {
      const response = await effectToResponse(
        c,
        claudeCodeController.getClaudeCodeMeta().pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .get("/features", async (c) => {
      const response = await effectToResponse(
        c,
        claudeCodeController
          .getAvailableFeatures()
          .pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .get("/session-processes", async (c) => {
      const response = await effectToResponse(
        c,
        claudeCodeSessionProcessController.getSessionProcesses(),
      );
      return response;
    })
    .post(
      "/session-processes",
      zValidator(
        "json",
        z.object({
          projectId: z.string(),
          input: userMessageInputSchema,
          baseSession: z.union([
            z.undefined(),
            z.object({
              type: z.literal("fork"),
              sessionId: z.string(),
            }),
            z.object({
              type: z.literal("resume"),
              sessionId: z.string(),
            }),
          ]),
          ccOptions: ccOptionsSchema.optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        const input = normalizeUserMessageInput(body.input);
        const { baseSession, ...rest } = body;
        const response = await effectToResponse(
          c,
          claudeCodeSessionProcessController.createSessionProcess({
            ...rest,
            input,
            baseSession: baseSession ?? undefined,
          }),
        );
        return response;
      },
    )
    .post(
      "/session-processes/:sessionProcessId/continue",
      zValidator(
        "json",
        z.object({
          projectId: z.string(),
          input: userMessageInputSchema,
          baseSessionId: z.string(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        const input = normalizeUserMessageInput(body.input);
        const response = await effectToResponse(
          c,
          claudeCodeSessionProcessController
            .continueSessionProcess({
              ...c.req.param(),
              ...body,
              input,
            })
            .pipe(Effect.provide(runtime)),
        );
        return response;
      },
    )
    .post(
      "/session-processes/:sessionProcessId/abort",
      zValidator("json", z.object({ projectId: z.string() })),
      async (c) => {
        const { sessionProcessId } = c.req.param();
        void Effect.runFork(
          claudeCodeLifeCycleService.abortTask(sessionProcessId),
        );
        return c.json({ message: "Task aborted" });
      },
    )
    .post(
      "/permission-response",
      zValidator(
        "json",
        z.object({
          permissionRequestId: z.string(),
          decision: z.enum(["allow", "deny"]),
        }),
      ),
      async (c) => {
        const response = await effectToResponse(
          c,
          claudeCodePermissionController.permissionResponse({
            permissionResponse: c.req.valid("json"),
          }),
        );
        return response;
      },
    );
});

export { claudeCodeRoutes };
