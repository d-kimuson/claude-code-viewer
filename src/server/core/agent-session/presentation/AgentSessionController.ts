import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { AgentSessionRepository } from "../infrastructure/AgentSessionRepository";
import { AgentSessionMappingService } from "../services/AgentSessionMappingService";

const LayerImpl = Effect.gen(function* () {
  const mappingService = yield* AgentSessionMappingService;
  const repository = yield* AgentSessionRepository;

  const getAgentSession = (params: {
    projectId: string;
    sessionId: string;
    prompt: string;
  }) =>
    Effect.gen(function* () {
      const { projectId, sessionId, prompt } = params;

      // Find agent file path using mapping service
      const agentFilePath = yield* mappingService.getAgentFilePath(
        projectId,
        sessionId,
        prompt,
      );

      if (agentFilePath === null) {
        return {
          status: 200,
          response: {
            agentSessionId: null,
            conversations: [],
          },
        } as const satisfies ControllerResponse;
      }

      // Extract agent session id from file path (agent-<hash>.jsonl)
      const agentSessionId =
        agentFilePath
          .split("/")
          .at(-1)
          ?.replace("agent-", "")
          .replace(".jsonl", "") ?? null;

      // Read conversations from agent file
      const conversations =
        yield* repository.getAgentSessionConversations(agentFilePath);

      return {
        status: 200,
        response: {
          agentSessionId,
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
