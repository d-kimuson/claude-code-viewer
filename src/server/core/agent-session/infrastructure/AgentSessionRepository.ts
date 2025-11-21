import { FileSystem } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import type { ExtendedConversation } from "../../types";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const getAgentSessionConversations = (
    agentFilePath: string,
  ): Effect.Effect<ExtendedConversation[], Error> =>
    Effect.gen(function* () {
      const content = yield* fs.readFileString(agentFilePath);
      const conversations = parseJsonl(content);
      return conversations;
    });

  return {
    getAgentSessionConversations,
  };
});

export class AgentSessionRepository extends Context.Tag(
  "AgentSessionRepository",
)<
  AgentSessionRepository,
  {
    readonly getAgentSessionConversations: (
      agentFilePath: string,
    ) => Effect.Effect<ExtendedConversation[], Error>;
  }
>() {
  static Live = Layer.effect(this, LayerImpl);
}

export type IAgentSessionRepository = Context.Tag.Service<
  typeof AgentSessionRepository
>;
