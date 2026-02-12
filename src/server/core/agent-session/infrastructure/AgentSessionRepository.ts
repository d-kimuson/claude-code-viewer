import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import { decodeProjectId } from "../../project/functions/id";
import { extractFirstUserText } from "../../session/functions/extractFirstUserText";
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

  /**
   * List all agent sessions for a given session.
   * Scans both legacy root directory and new subagents directory.
   */
  const listAgentSessionsForSession = (
    projectId: string,
    sessionId: string,
  ): Effect.Effect<{ agentId: string; firstMessage: string | null }[], Error> =>
    Effect.gen(function* () {
      const projectPath = decodeProjectId(projectId);
      const results: { agentId: string; firstMessage: string | null }[] = [];

      const extractAgentId = (filename: string): string | null => {
        const match = /^agent-(.+)\.jsonl$/.exec(filename);
        return match ? (match[1] ?? null) : null;
      };

      const processFile = (
        filePath: string,
        filename: string,
      ): Effect.Effect<void, Error> =>
        Effect.gen(function* () {
          const agentId = extractAgentId(filename);
          if (agentId === null) return;

          const content = yield* fs.readFileString(filePath);
          const firstLine = content.split("\n")[0];
          if (!firstLine || firstLine.trim() === "") return;

          try {
            const conversations = parseJsonl(firstLine);
            const firstConv = conversations[0];
            const firstMessage = firstConv
              ? extractFirstUserText(firstConv)
              : null;
            results.push({ agentId, firstMessage });
          } catch {
            results.push({ agentId, firstMessage: null });
          }
        });

      // Check subagents directory: {project}/{sessionId}/subagents/
      const subagentsDir = path.join(projectPath, sessionId, "subagents");
      const subagentsDirExists = yield* fs.exists(subagentsDir);

      if (subagentsDirExists) {
        const entries = yield* fs
          .readDirectory(subagentsDir)
          .pipe(Effect.catchAll(() => Effect.succeed([] as string[])));

        const agentFiles = entries.filter(
          (f) => f.startsWith("agent-") && f.endsWith(".jsonl"),
        );

        for (const filename of agentFiles) {
          yield* processFile(path.join(subagentsDir, filename), filename).pipe(
            Effect.catchAll(() => Effect.void),
          );
        }
      }

      // Check legacy root directory
      const rootEntries = yield* fs
        .readDirectory(projectPath)
        .pipe(Effect.catchAll(() => Effect.succeed([] as string[])));

      const rootAgentFiles = rootEntries.filter(
        (f) => f.startsWith("agent-") && f.endsWith(".jsonl"),
      );

      for (const filename of rootAgentFiles) {
        const filePath = path.join(projectPath, filename);
        // Only include if the first line's sessionId matches
        const content = yield* fs
          .readFileString(filePath)
          .pipe(Effect.catchAll(() => Effect.succeed("")));
        const firstLine = content.split("\n")[0];
        if (!firstLine || firstLine.trim() === "") continue;

        try {
          const parsed = JSON.parse(firstLine);
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "sessionId" in parsed &&
            parsed.sessionId === sessionId
          ) {
            yield* processFile(filePath, filename).pipe(
              Effect.catchAll(() => Effect.void),
            );
          }
        } catch {
          // skip invalid files
        }
      }

      return results;
    });

  return {
    getAgentSessionByAgentId,
    listAgentSessionsForSession,
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
    readonly listAgentSessionsForSession: (
      projectId: string,
      sessionId: string,
    ) => Effect.Effect<
      { agentId: string; firstMessage: string | null }[],
      Error
    >;
  }
>() {
  static Live = Layer.effect(this, LayerImpl);
}

export type IAgentSessionRepository = Context.Tag.Service<
  typeof AgentSessionRepository
>;
