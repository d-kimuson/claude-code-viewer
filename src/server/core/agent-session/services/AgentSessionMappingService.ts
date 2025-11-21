import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Ref } from "effect";
import { UserEntrySchema } from "../../../../lib/conversation-schema/entry/UserEntrySchema";
import { decodeProjectId } from "../../project/functions/id";
import { normalizePrompt } from "../functions/normalizePrompt";

/**
 * Cache structure: Map<cacheKey, agentFilePath>
 * cacheKey format: `${sessionId}::${normalizedPrompt}`
 */
type AgentSessionMappingCache = Map<string, string>;

const makeCacheKey = (sessionId: string, prompt: string): string => {
  return `${sessionId}::${normalizePrompt(prompt)}`;
};

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cacheRef = yield* Ref.make<AgentSessionMappingCache>(new Map());

  /**
   * Scans agent files in a project directory and populates cache for a specific sessionId
   */
  const populateCacheForSession = (
    projectId: string,
    sessionId: string,
  ): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const projectPath = decodeProjectId(projectId);
      const dirents = yield* fs.readDirectory(projectPath);

      const agentFiles = dirents.filter((entry) => entry.startsWith("agent-"));

      for (const agentFile of agentFiles) {
        const agentFilePath = path.resolve(projectPath, agentFile);
        const content = yield* fs.readFileString(agentFilePath);
        const firstLine = content.split("\n")[0];

        if (firstLine === undefined || firstLine.trim() === "") {
          continue;
        }

        try {
          const parsed = JSON.parse(firstLine);
          const userEntry = UserEntrySchema.safeParse(parsed);

          if (!userEntry.success) {
            continue;
          }

          // Check if this agent file belongs to the target sessionId
          if (userEntry.data.sessionId !== sessionId) {
            continue;
          }

          // Extract prompt from the parsed user entry
          const messageContent = userEntry.data.message.content;
          let prompt: string | null = null;

          if (typeof messageContent === "string") {
            prompt = messageContent;
          } else {
            // Handle array content
            const firstContent = messageContent[0];
            if (firstContent !== undefined) {
              if (typeof firstContent === "string") {
                prompt = firstContent;
              } else if (
                "type" in firstContent &&
                firstContent.type === "text"
              ) {
                prompt = firstContent.text;
              }
            }
          }

          if (prompt === null) {
            continue;
          }

          // Add to cache
          const cacheKey = makeCacheKey(sessionId, prompt);
          yield* Ref.update(cacheRef, (cache) => {
            cache.set(cacheKey, agentFilePath);
            return cache;
          });
        } catch {}
      }
    });

  const getAgentFilePath = (
    projectId: string,
    sessionId: string,
    prompt: string,
  ): Effect.Effect<string | null, Error> =>
    Effect.gen(function* () {
      const cacheKey = makeCacheKey(sessionId, prompt);
      const cache = yield* Ref.get(cacheRef);

      // Check cache
      const cached = cache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // Cache miss - populate cache for this session
      yield* populateCacheForSession(projectId, sessionId);

      // Check cache again
      const updatedCache = yield* Ref.get(cacheRef);
      const result = updatedCache.get(cacheKey);

      return result ?? null;
    });

  const invalidateSession = (sessionId: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      yield* Ref.update(cacheRef, (cache) => {
        // Remove all entries that start with sessionId
        const newCache = new Map<string, string>();
        for (const [key, value] of cache.entries()) {
          if (!key.startsWith(`${sessionId}::`)) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    });

  const invalidateAgentFile = (agentSessionId: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      yield* Ref.update(cacheRef, (cache) => {
        // Remove all entries where the value contains the agent session id
        const newCache = new Map<string, string>();
        for (const [key, value] of cache.entries()) {
          if (!value.includes(`agent-${agentSessionId}.jsonl`)) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    });

  return {
    getAgentFilePath,
    invalidateSession,
    invalidateAgentFile,
  };
});

export class AgentSessionMappingService extends Context.Tag(
  "AgentSessionMappingService",
)<
  AgentSessionMappingService,
  {
    readonly getAgentFilePath: (
      projectId: string,
      sessionId: string,
      prompt: string,
    ) => Effect.Effect<string | null, Error>;
    readonly invalidateSession: (sessionId: string) => Effect.Effect<void>;
    readonly invalidateAgentFile: (
      agentSessionId: string,
    ) => Effect.Effect<void>;
  }
>() {
  static Live = Layer.effect(this, LayerImpl);
}

export type IAgentSessionMappingService = Context.Tag.Service<
  typeof AgentSessionMappingService
>;
