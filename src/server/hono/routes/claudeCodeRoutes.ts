import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { z } from "zod";
import type { UserMessageInput } from "../../core/claude-code/functions/createMessageGenerator.ts";
import { CCVAskUserQuestionController } from "../../core/claude-code/presentation/CCVAskUserQuestionController.ts";
import { ClaudeCodeController } from "../../core/claude-code/presentation/ClaudeCodeController.ts";
import { ClaudeCodePermissionController } from "../../core/claude-code/presentation/ClaudeCodePermissionController.ts";
import { ClaudeCodeSessionProcessController } from "../../core/claude-code/presentation/ClaudeCodeSessionProcessController.ts";
import { ccOptionsSchema, userMessageInputSchema } from "../../core/claude-code/schema.ts";
import { ClaudeCodeLifeCycleService } from "../../core/claude-code/services/ClaudeCodeLifeCycleService.ts";
import { effectToResponse } from "../../lib/effect/toEffectResponse.ts";
import type { HonoContext } from "../app.ts";
import { getHonoRuntime } from "../runtime.ts";

const normalizeUserMessageInput = (
  input: z.infer<typeof userMessageInputSchema>,
): UserMessageInput => {
  const images = input.images?.map((image) => ({
    type: image.type,
    source: image.source,
  }));
  const documents = input.documents?.map((document) => ({
    type: document.type,
    source: document.source,
  }));

  return {
    text: input.text,
    images,
    documents,
  };
};

const claudeCodeRoutes = Effect.gen(function* () {
  const claudeCodeController = yield* ClaudeCodeController;
  const claudeCodeSessionProcessController = yield* ClaudeCodeSessionProcessController;
  const ccvAskUserQuestionController = yield* CCVAskUserQuestionController;
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
        claudeCodeController.getAvailableFeatures().pipe(Effect.provide(runtime)),
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
          sessionId: z.uuid(),
          input: userMessageInputSchema,
          resume: z.boolean(),
          ccOptions: ccOptionsSchema.optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        const input = normalizeUserMessageInput(body.input);
        const response = await effectToResponse(
          c,
          claudeCodeSessionProcessController.createSessionProcess({
            ...body,
            input,
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
      "/session-processes/:sessionProcessId/enqueue",
      zValidator(
        "json",
        z.object({
          projectId: z.string(),
          input: userMessageInputSchema,
        }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        const input = normalizeUserMessageInput(body.input);
        const response = await effectToResponse(
          c,
          claudeCodeSessionProcessController
            .enqueueMessage({
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
      (c) => {
        const { sessionProcessId } = c.req.param();
        void Effect.runFork(claudeCodeLifeCycleService.abortTask(sessionProcessId));
        return c.json({ message: "Task aborted" });
      },
    )
    .get("/pending-permission-requests", async (c) => {
      const response = await effectToResponse(
        c,
        claudeCodePermissionController.getPendingPermissionRequests(),
      );
      return response;
    })
    .get("/pending-question-requests", async (c) => {
      const response = await effectToResponse(
        c,
        ccvAskUserQuestionController.getPendingQuestionRequests(),
      );
      return response;
    })
    .post(
      "/permission-response",
      zValidator(
        "json",
        z.object({
          permissionRequestId: z.string(),
          decision: z.enum(["allow", "deny", "always_allow"]),
          alwaysAllowRule: z.string().optional(),
          alwaysAllowScope: z.enum(["session", "project"]).optional(),
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
    )
    .post(
      "/question-response",
      zValidator(
        "json",
        z.object({
          questionRequestId: z.string(),
          answers: z.record(z.string(), z.string()),
          annotations: z.record(
            z.string(),
            z.object({
              notes: z.string().optional(),
              preview: z.string().optional(),
            }),
          ),
        }),
      ),
      async (c) => {
        const response = await effectToResponse(
          c,
          ccvAskUserQuestionController.questionResponse({
            questionResponse: c.req.valid("json"),
          }),
        );
        return response;
      },
    )
    .post(
      "/generate-permission-rule",
      zValidator(
        "json",
        z.object({
          toolName: z.string(),
          toolInput: z.record(z.string(), z.unknown()),
          projectId: z.string(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        const response = await effectToResponse(
          c,
          claudeCodePermissionController.generatePermissionRuleForTool(body),
        );
        return response;
      },
    );
});

export { claudeCodeRoutes };
