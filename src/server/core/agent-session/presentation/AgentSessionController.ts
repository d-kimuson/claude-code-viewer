import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { AgentSessionRepository } from "../infrastructure/AgentSessionRepository";

const LayerImpl = Effect.gen(function* () {
  const repository = yield* AgentSessionRepository;

  /**
   * Get agent session by agentId.
   * Directly reads agent-${agentId}.jsonl file without mapping service.
   */
  const getAgentSession = (params: {
    projectId: string;
    agentId: string;
    sessionId?: string;
  }) =>
    Effect.gen(function* () {
      const { projectId, agentId, sessionId } = params;

      // Read conversations directly using agentId
      const conversations = yield* repository.getAgentSessionByAgentId(
        projectId,
        agentId,
        sessionId,
      );

      if (conversations === null) {
        return {
          status: 200,
          response: {
            agentSessionId: null,
            conversations: [],
          },
        } as const satisfies ControllerResponse;
      }

      return {
        status: 200,
        response: {
          agentSessionId: agentId,
          conversations,
        },
      } as const satisfies ControllerResponse;
    });

  return {
    getAgentSession,
  };
});

export type IAgentSessionController = InferEffect<typeof LayerImpl>;

export class AgentSessionController extends Context.Tag(
  "AgentSessionController",
)<AgentSessionController, IAgentSessionController>() {
  static Live = Layer.effect(this, LayerImpl);
}
