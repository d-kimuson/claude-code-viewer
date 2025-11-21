import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Option } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import { parseUserMessage } from "../../claude-code/functions/parseUserMessage";
import { decodeProjectId } from "../../project/functions/id";
import type { Session, SessionDetail } from "../../types";
import { decodeSessionId, encodeSessionId } from "../functions/id";
import { isRegularSessionFile } from "../functions/isRegularSessionFile";
import { VirtualConversationDatabase } from "../infrastructure/VirtualConversationDatabase";
import { SessionMetaService } from "../services/SessionMetaService";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sessionMetaService = yield* SessionMetaService;
  const virtualConversationDatabase = yield* VirtualConversationDatabase;

  const getSession = (projectId: string, sessionId: string) =>
    Effect.gen(function* () {
      const sessionPath = decodeSessionId(projectId, sessionId);

      const virtualConversation =
        yield* virtualConversationDatabase.getSessionVirtualConversation(
          sessionId,
        );

      // Check if session file exists
      const exists = yield* fs.exists(sessionPath);
      const sessionDetail = yield* exists
        ? Effect.gen(function* () {
            // Read session file
            const content = yield* fs.readFileString(sessionPath);
            const allLines = content.split("\n").filter((line) => line.trim());

            const conversations = parseJsonl(allLines.join("\n"));

            // Get file stats
            const stat = yield* fs.stat(sessionPath);

            // Get session metadata
            const meta = yield* sessionMetaService.getSessionMeta(
              projectId,
              sessionId,
            );

            const mergedConversations = [
              ...conversations,
              ...(virtualConversation !== null
                ? virtualConversation.conversations
                : []),
            ];

            const conversationMap = new Map(
              mergedConversations.flatMap((c, index) => {
                if (
                  c.type === "user" ||
                  c.type === "assistant" ||
                  c.type === "system"
                ) {
                  return [[c.uuid, { conversation: c, index }] as const];
                } else {
                  return [];
                }
              }),
            );

            const isBroken = mergedConversations.some((item, index) => {
              if (item.type !== "summary") return false;
              const leftMessage = conversationMap.get(item.leafUuid);
              if (leftMessage === undefined) return false;

              return index < leftMessage.index;
            });

            const sessionDetail: SessionDetail = {
              id: sessionId,
              jsonlFilePath: sessionPath,
              meta,
              conversations: isBroken ? conversations : mergedConversations,
              lastModifiedAt: Option.getOrElse(stat.mtime, () => new Date()),
            };

            return sessionDetail;
          })
        : (() => {
            if (virtualConversation === null) {
              return Effect.succeed(null);
            }

            const lastConversation = virtualConversation.conversations
              .filter(
                (conversation) =>
                  conversation.type === "user" ||
                  conversation.type === "assistant" ||
                  conversation.type === "system",
              )
              .at(-1);

            const virtualSession: SessionDetail = {
              id: sessionId,
              jsonlFilePath: `${decodeProjectId(projectId)}/${sessionId}.jsonl`,
              meta: {
                messageCount: 0,
                firstUserMessage: null,
                cost: {
                  totalUsd: 0,
                  breakdown: {
                    inputTokensUsd: 0,
                    outputTokensUsd: 0,
                    cacheCreationUsd: 0,
                    cacheReadUsd: 0,
                  },
                  tokenUsage: {
                    inputTokens: 0,
                    outputTokens: 0,
                    cacheCreationTokens: 0,
                    cacheReadTokens: 0,
                  },
                },
              },
              conversations: virtualConversation.conversations,
              lastModifiedAt:
                lastConversation !== undefined
                  ? new Date(lastConversation.timestamp)
                  : new Date(),
            };

            return Effect.succeed(virtualSession);
          })();

      return {
        session: sessionDetail,
      };
    });

  const getSessions = (
    projectId: string,
    options?: {
      maxCount?: number;
      cursor?: string;
    },
  ) =>
    Effect.gen(function* () {
      const { maxCount = 20, cursor } = options ?? {};

      const claudeProjectPath = decodeProjectId(projectId);

      // Check if project directory exists
      const dirExists = yield* fs.exists(claudeProjectPath);
      if (!dirExists) {
        console.warn(`Project directory not found at ${claudeProjectPath}`);
        return { sessions: [] };
      }

      // Read directory entries with error handling
      const dirents = yield* Effect.tryPromise({
        try: () => fs.readDirectory(claudeProjectPath).pipe(Effect.runPromise),
        catch: (error) => {
          console.warn(
            `Failed to read sessions for project ${projectId}:`,
            error,
          );
          return new Error("Failed to read directory");
        },
      }).pipe(Effect.catchAll(() => Effect.succeed([])));

      // Process session files (excluding agent-*.jsonl files)
      const sessionEffects = dirents.filter(isRegularSessionFile).map((entry) =>
        Effect.gen(function* () {
          const fullPath = path.resolve(claudeProjectPath, entry);
          const sessionId = encodeSessionId(fullPath);

          // Get file stats with error handling
          const stat = yield* Effect.tryPromise(() =>
            fs.stat(fullPath).pipe(Effect.runPromise),
          ).pipe(Effect.catchAll(() => Effect.succeed(null)));

          if (!stat) {
            return null;
          }

          return {
            id: sessionId,
            jsonlFilePath: fullPath,
            lastModifiedAt: Option.getOrElse(stat.mtime, () => new Date()),
          };
        }),
      );

      // Execute all effects in parallel and filter out nulls
      const sessionsWithNulls = yield* Effect.all(sessionEffects, {
        concurrency: "unbounded",
      });
      const sessions = sessionsWithNulls
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .sort(
          (a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime(),
        );

      const sessionMap = new Map(
        sessions.map((session) => [session.id, session] as const),
      );

      const index =
        cursor !== undefined
          ? sessions.findIndex((session) => session.id === cursor)
          : -1;

      if (index !== -1) {
        const sessionsToReturn = sessions.slice(
          index + 1,
          Math.min(index + 1 + maxCount, sessions.length),
        );

        const sessionsWithMeta = yield* Effect.all(
          sessionsToReturn.map((item) =>
            Effect.gen(function* () {
              const meta = yield* sessionMetaService.getSessionMeta(
                projectId,
                item.id,
              );
              return {
                ...item,
                meta,
              };
            }),
          ),
          { concurrency: "unbounded" },
        );

        return {
          sessions: sessionsWithMeta,
        };
      }

      // Get predict sessions
      const virtualConversations =
        yield* virtualConversationDatabase.getProjectVirtualConversations(
          projectId,
        );

      const virtualSessions = virtualConversations
        .filter(({ sessionId }) => !sessionMap.has(sessionId))
        .map(({ sessionId, conversations }): Session => {
          const first = conversations
            .filter((conversation) => conversation.type === "user")
            .at(0);
          const last = conversations
            .filter(
              (conversation) =>
                conversation.type === "user" ||
                conversation.type === "assistant" ||
                conversation.type === "system",
            )
            .at(-1);

          const firstUserText =
            first !== undefined
              ? typeof first.message.content === "string"
                ? first.message.content
                : (() => {
                    const firstContent = first.message.content.at(0);
                    if (firstContent === undefined) return null;
                    if (typeof firstContent === "string") return firstContent;
                    if (firstContent.type === "text") return firstContent.text;
                    return null;
                  })()
              : null;

          return {
            id: sessionId,
            jsonlFilePath: `${decodeProjectId(projectId)}/${sessionId}.jsonl`,
            lastModifiedAt:
              last !== undefined ? new Date(last.timestamp) : new Date(),
            meta: {
              messageCount: conversations.length,
              firstUserMessage: firstUserText
                ? parseUserMessage(firstUserText)
                : null,
              cost: {
                totalUsd: 0,
                breakdown: {
                  inputTokensUsd: 0,
                  outputTokensUsd: 0,
                  cacheCreationUsd: 0,
                  cacheReadUsd: 0,
                },
                tokenUsage: {
                  inputTokens: 0,
                  outputTokens: 0,
                  cacheCreationTokens: 0,
                  cacheReadTokens: 0,
                },
              },
            },
          };
        })
        .sort((a, b) => {
          return b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime();
        });

      // Get sessions with metadata
      const sessionsToReturn = sessions.slice(
        0,
        Math.min(maxCount, sessions.length),
      );
      const sessionsWithMeta: Session[] = yield* Effect.all(
        sessionsToReturn.map((item) =>
          Effect.gen(function* () {
            const meta = yield* sessionMetaService.getSessionMeta(
              projectId,
              item.id,
            );
            return {
              ...item,
              meta,
            };
          }),
        ),
        { concurrency: "unbounded" },
      );

      return {
        sessions: [...virtualSessions, ...sessionsWithMeta],
      };
    });

  return {
    getSession,
    getSessions,
  };
});

export type ISessionRepository = InferEffect<typeof LayerImpl>;

export class SessionRepository extends Context.Tag("SessionRepository")<
  SessionRepository,
  ISessionRepository
>() {
  static Live = Layer.effect(this, LayerImpl);
}
