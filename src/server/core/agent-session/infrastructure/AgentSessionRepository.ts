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
   * Checks new path: {project}/{sessionId}/subagents/agent-{agentId}.jsonl
   * Fallback to old path: {project}/agent-{agentId}.jsonl
   */
  const getAgentSessionByAgentId = (
    projectId: string,
    agentId: string,
    sessionId?: string,
  ): Effect.Effect<ExtendedConversation[] | null, Error> =>
    Effect.gen(function* () {
      const projectPath = decodeProjectId(projectId);

      // Try new path if sessionId is provided
      if (sessionId) {
        const newPath = path.resolve(
          projectPath,
          sessionId,
          "subagents",
          `agent-${agentId}.jsonl`,
        );

        if (yield* fs.exists(newPath)) {
          const content = yield* fs.readFileString(newPath);
          return parseJsonl(content);
        }
      }

      // Fallback to old path
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
      sessionId?: string,
    ) => Effect.Effect<ExtendedConversation[] | null, Error>;
  }
>() {
  static Live = Layer.effect(this, LayerImpl);
}

export type IAgentSessionRepository = Context.Tag.Service<
  typeof AgentSessionRepository
>;
