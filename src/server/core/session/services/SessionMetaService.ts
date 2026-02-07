import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Ref } from "effect";
import {
  FileCacheStorage,
  makeFileCacheStorageLayer,
} from "../../../lib/storage/FileCacheStorage";
import { PersistentService } from "../../../lib/storage/FileCacheStorage/PersistentService";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import {
  type ParsedUserMessage,
  parsedUserMessageSchema,
} from "../../claude-code/functions/parseUserMessage";
import type { SessionMeta } from "../../types";
import { aggregateTokenUsageAndCost } from "../functions/aggregateTokenUsageAndCost";
import { getAgentSessionFilesForSession } from "../functions/getAgentSessionFilesForSession";
import { decodeSessionId } from "../functions/id";
import {
  extractFirstUserMessage,
  isLocalCommandCaveat,
} from "../functions/isValidFirstMessage";

const parsedUserMessageOrNullSchema = parsedUserMessageSchema.nullable();

export class SessionMetaService extends Context.Tag("SessionMetaService")<
  SessionMetaService,
  {
    readonly getSessionMeta: (
      projectId: string,
      sessionId: string,
    ) => Effect.Effect<SessionMeta, Error>;
    readonly invalidateSession: (
      projectId: string,
      sessionId: string,
    ) => Effect.Effect<void>;
  }
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const firstUserMessageCache =
        yield* FileCacheStorage<ParsedUserMessage | null>();
      const sessionMetaCacheRef = yield* Ref.make(
        new Map<string, SessionMeta>(),
      );

      const getFirstUserMessage = (
        jsonlFilePath: string,
        lines: string[],
      ): Effect.Effect<ParsedUserMessage | null, Error> =>
        Effect.gen(function* () {
          const cached = yield* firstUserMessageCache.get(jsonlFilePath);
          if (cached !== undefined) {
            if (
              cached !== null &&
              cached.kind === "text" &&
              isLocalCommandCaveat(cached.content)
            ) {
              // Ignore stale cache entries that only contain the caveat.
            } else {
              return cached;
            }
          }

          let firstUserMessage: ParsedUserMessage | null = null;

          for (const line of lines) {
            const conversation = parseJsonl(line).at(0);

            if (conversation === undefined) {
              continue;
            }

            const maybeFirstUserMessage = extractFirstUserMessage(conversation);

            if (maybeFirstUserMessage === undefined) {
              continue;
            }

            firstUserMessage = maybeFirstUserMessage;

            break;
          }

          if (firstUserMessage !== null) {
            yield* firstUserMessageCache.set(jsonlFilePath, firstUserMessage);
          }

          return firstUserMessage;
        });

      const getSessionMeta = (
        projectId: string,
        sessionId: string,
      ): Effect.Effect<SessionMeta, Error> =>
        Effect.gen(function* () {
          const metaCache = yield* Ref.get(sessionMetaCacheRef);
          const cached = metaCache.get(sessionId);
          if (cached !== undefined) {
            return cached;
          }

          const sessionPath = decodeSessionId(projectId, sessionId);
          const content = yield* fs.readFileString(sessionPath);
          const lines = content.split("\n");

          const firstUserMessage = yield* getFirstUserMessage(
            sessionPath,
            lines,
          );

          // Get project directory from session path
          const projectPath = path.dirname(sessionPath);

          // Parse first line to extract actual sessionId
          const firstLine = lines[0];
          let actualSessionId: string | undefined;
          if (firstLine && firstLine.trim() !== "") {
            try {
              const firstLineData = JSON.parse(firstLine);
              if (
                typeof firstLineData === "object" &&
                firstLineData !== null &&
                "sessionId" in firstLineData &&
                typeof firstLineData.sessionId === "string"
              ) {
                actualSessionId = firstLineData.sessionId;
              }
            } catch {
              // Invalid JSON, skip sessionId extraction
            }
          }

          // Discover agent session files that belong to this session
          const agentFilePaths =
            actualSessionId !== undefined
              ? yield* getAgentSessionFilesForSession(
                  projectPath,
                  actualSessionId,
                ).pipe(
                  Effect.provide(Layer.succeed(FileSystem.FileSystem, fs)),
                  Effect.provide(Layer.succeed(Path.Path, path)),
                )
              : [];

          // Read contents of all agent files
          const agentContents: string[] = [];
          for (const agentPath of agentFilePaths) {
            const agentContent = yield* fs
              .readFileString(agentPath)
              .pipe(Effect.catchAll(() => Effect.succeed(""))); // Skip files that fail to read
            if (agentContent !== "") {
              agentContents.push(agentContent);
            }
          }

          // Calculate cost information including agent sessions
          const fileContents = [content, ...agentContents];
          const { totalCost, modelName } =
            aggregateTokenUsageAndCost(fileContents);

          const sessionMeta: SessionMeta = {
            messageCount: lines.length,
            firstUserMessage: firstUserMessage,
            cost: {
              totalUsd: totalCost.totalUsd,
              breakdown: totalCost.breakdown,
              tokenUsage: totalCost.tokenUsage,
            },
            modelName: modelName,
          };

          yield* Ref.update(sessionMetaCacheRef, (cache) => {
            cache.set(sessionId, sessionMeta);
            return cache;
          });

          return sessionMeta;
        });

      const invalidateSession = (
        _projectId: string,
        sessionId: string,
      ): Effect.Effect<void> =>
        Effect.gen(function* () {
          yield* Ref.update(sessionMetaCacheRef, (cache) => {
            cache.delete(sessionId);
            return cache;
          });
        });

      return {
        getSessionMeta,
        invalidateSession,
      };
    }),
  ).pipe(
    Layer.provide(
      makeFileCacheStorageLayer(
        "first-user-message-cache",
        parsedUserMessageOrNullSchema,
      ),
    ),
    Layer.provide(PersistentService.Live),
  );
}

export type ISessionMetaService = Context.Tag.Service<
  typeof SessionMetaService
>;
