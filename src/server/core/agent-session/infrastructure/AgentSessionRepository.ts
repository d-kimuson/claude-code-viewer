import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import { decodeProjectId } from "../../project/functions/id";
import type { ExtendedConversation } from "../../types";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  /**
   * Get agent session conversations by agentId.
   * Directly reads agent-${agentId}.jsonl file from project directory.
   * Returns null if file does not exist.
   */
  const getAgentSessionByAgentId = (
    projectId: string,
    agentId: string,
  ): Effect.Effect<ExtendedConversation[] | null, Error> =>
    Effect.gen(function* () {
      const projectPath = decodeProjectId(projectId);
      const agentFilePath = path.resolve(projectPath, `agent-${agentId}.jsonl`);

      // Check if file exists
      const exists = yield* fs.exists(agentFilePath);
      if (!exists) {
        return null;
      }

      const content = yield* fs.readFileString(agentFilePath);
      const conversations = parseJsonl(content);
      return conversations;
    });

  return {
    getAgentSessionByAgentId,
  };
});

export class AgentSessionRepository extends Context.Tag(
  "AgentSessionRepository",
)<
  AgentSessionRepository,
  {
    readonly getAgentSessionByAgentId: (
      projectId: string,
      agentId: string,
    ) => Effect.Effect<ExtendedConversation[] | null, Error>;
  }
>() {
  static Live = Layer.effect(this, LayerImpl);
}

export type IAgentSessionRepository = Context.Tag.Service<
  typeof AgentSessionRepository
>;
