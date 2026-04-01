import {
  createSdkMcpServer,
  type McpSdkServerConfigWithInstance,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { Context, Deferred, Effect, Layer, Ref } from "effect";
import { ulid } from "ulid";
import { z } from "zod";
import type { QuestionRequest, QuestionResponse } from "../../../../types/question";
import type { InferEffect } from "../../../lib/effect/types";
import { EventBus } from "../../events/services/EventBus";

const LayerImpl = Effect.gen(function* () {
  const pendingQuestionsRef = yield* Ref.make<Map<string, QuestionRequest>>(new Map());
  const deferredsRef = yield* Ref.make<Map<string, Deferred.Deferred<QuestionResponse, never>>>(
    new Map(),
  );
  const eventBus = yield* EventBus;

  const waitQuestionResponse = (request: QuestionRequest) =>
    Effect.gen(function* () {
      const deferred = yield* Deferred.make<QuestionResponse, never>();

      yield* Ref.update(deferredsRef, (deferreds) => {
        const next = new Map(deferreds);
        next.set(request.id, deferred);
        return next;
      });

      yield* Ref.update(pendingQuestionsRef, (requests) => {
        const next = new Map(requests);
        next.set(request.id, request);
        return next;
      });

      yield* eventBus.emit("questionRequested", {
        questionRequest: request,
      });

      const response = yield* Deferred.await(deferred);

      yield* Ref.update(pendingQuestionsRef, (requests) => {
        const next = new Map(requests);
        next.delete(request.id);
        return next;
      });

      yield* Ref.update(deferredsRef, (deferreds) => {
        const next = new Map(deferreds);
        next.delete(request.id);
        return next;
      });

      return response;
    });

  const respondToQuestion = (response: QuestionResponse): Effect.Effect<void> =>
    Effect.gen(function* () {
      const deferreds = yield* Ref.get(deferredsRef);
      const deferred = deferreds.get(response.questionRequestId);

      if (deferred !== undefined) {
        // Look up the sessionId before deleting from the map
        const pendingQuestions = yield* Ref.get(pendingQuestionsRef);
        const request = pendingQuestions.get(response.questionRequestId);

        yield* Deferred.succeed(deferred, response);

        yield* Ref.update(pendingQuestionsRef, (requests) => {
          const next = new Map(requests);
          next.delete(response.questionRequestId);
          return next;
        });

        yield* Ref.update(deferredsRef, (ds) => {
          const next = new Map(ds);
          next.delete(response.questionRequestId);
          return next;
        });

        if (request !== undefined) {
          yield* eventBus.emit("questionResolved", {
            sessionId: request.sessionId,
          });
        }
      }
    });

  const createMcpServer = (options: {
    turnId: string;
    projectId: string;
    sessionId: string;
  }): McpSdkServerConfigWithInstance => {
    const { turnId, projectId, sessionId } = options;

    const questionInputSchema = {
      questions: z
        .array(
          z.object({
            question: z.string().describe("The question to ask"),
            header: z.string().max(12).describe("Short label (max 12 chars)"),
            options: z
              .array(
                z.object({
                  label: z.string().describe("Display text (1-5 words)"),
                  description: z.string().describe("What this option means"),
                  preview: z.string().optional().describe("Optional preview content"),
                }),
              )
              .min(2)
              .max(4),
            multiSelect: z.boolean().default(false),
          }),
        )
        .min(1)
        .max(4),
    };

    const ccvAskUserQuestionTool = tool(
      "CCVAskUserQuestion",
      "Ask the user questions through the Claude Code Viewer web interface. This tool replaces AskUserQuestion for web-based sessions. Use this to:\n1. Gather user preferences or requirements\n2. Clarify ambiguous instructions\n3. Get decisions on implementation choices\n4. Offer choices about what direction to take.\n\nUsers can select from provided options or type custom input. Use multiSelect: true to allow multiple answers.",
      questionInputSchema,
      async (args) => {
        const questionRequest: QuestionRequest = {
          id: ulid(),
          turnId,
          projectId,
          sessionId,
          questions: args.questions.map((q) => ({
            question: q.question,
            header: q.header,
            options: q.options.map((o) => ({
              label: o.label,
              description: o.description,
              preview: o.preview,
            })),
            multiSelect: q.multiSelect,
          })),
          timestamp: Date.now(),
        };

        const response = await Effect.runPromise(waitQuestionResponse(questionRequest));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.answers),
            },
          ],
        };
      },
    );

    return createSdkMcpServer({
      name: "ccv-ask-user-question",
      tools: [ccvAskUserQuestionTool],
    });
  };

  const cancelPendingRequests = (sessionId: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      const pendingQuestions = yield* Ref.get(pendingQuestionsRef);
      const deferreds = yield* Ref.get(deferredsRef);

      const matchingRequestIds: string[] = [];
      for (const [id, request] of pendingQuestions) {
        if (request.sessionId === sessionId) {
          matchingRequestIds.push(id);
          const deferred = deferreds.get(id);
          if (deferred !== undefined) {
            const emptyResponse: QuestionResponse = {
              questionRequestId: request.id,
              answers: {},
              annotations: {},
            };
            yield* Deferred.succeed(deferred, emptyResponse);
          }
        }
      }

      if (matchingRequestIds.length > 0) {
        yield* Ref.update(pendingQuestionsRef, (requests) => {
          const next = new Map(requests);
          for (const id of matchingRequestIds) {
            next.delete(id);
          }
          return next;
        });

        yield* Ref.update(deferredsRef, (ds) => {
          const next = new Map(ds);
          for (const id of matchingRequestIds) {
            next.delete(id);
          }
          return next;
        });
      }
    });

  const getPendingQuestionRequests = Effect.gen(function* () {
    const pendingQuestions = yield* Ref.get(pendingQuestionsRef);
    return [...pendingQuestions.values()];
  });

  return {
    waitQuestionResponse,
    respondToQuestion,
    createMcpServer,
    cancelPendingRequests,
    getPendingQuestionRequests,
  };
});

export type ICCVAskUserQuestionService = InferEffect<typeof LayerImpl>;

export class CCVAskUserQuestionService extends Context.Tag("CCVAskUserQuestionService")<
  CCVAskUserQuestionService,
  ICCVAskUserQuestionService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
