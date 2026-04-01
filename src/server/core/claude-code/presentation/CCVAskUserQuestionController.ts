import { Context, Effect, Layer } from "effect";
import type { QuestionResponse } from "../../../../types/question";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { CCVAskUserQuestionService } from "../services/CCVAskUserQuestionService";

const LayerImpl = Effect.gen(function* () {
  const ccvAskUserQuestionService = yield* CCVAskUserQuestionService;

  const questionResponse = (options: { questionResponse: QuestionResponse }) =>
    Effect.sync(() => {
      Effect.runFork(
        ccvAskUserQuestionService.respondToQuestion(options.questionResponse),
      );

      return {
        status: 200,
        response: {
          message: "Question response received",
        },
      } as const satisfies ControllerResponse;
    });

  const getPendingQuestionRequests = () =>
    Effect.gen(function* () {
      const questionRequests =
        yield* ccvAskUserQuestionService.getPendingQuestionRequests;

      return {
        status: 200,
        response: {
          questionRequests,
        },
      } as const satisfies ControllerResponse;
    });

  return {
    questionResponse,
    getPendingQuestionRequests,
  };
});

export type ICCVAskUserQuestionController = InferEffect<typeof LayerImpl>;
export class CCVAskUserQuestionController extends Context.Tag(
  "CCVAskUserQuestionController",
)<CCVAskUserQuestionController, ICCVAskUserQuestionController>() {
  static Live = Layer.effect(this, LayerImpl);
}
