import { resolve } from "node:path";
import { FileSystem } from "@effect/platform";
import { Context, Effect, Layer, Option } from "effect";
import { uniqBy } from "es-toolkit";
import { parseCommandXml } from "../parseCommandXml";
import { parseJsonl } from "../parseJsonl";
import { decodeProjectId } from "../project/id";
import type { Session, SessionDetail } from "../types";
import { decodeSessionId, encodeSessionId } from "./id";
import { VirtualConversationDatabase } from "./PredictSessionsDatabase";
import { SessionMetaService } from "./SessionMetaService";

const getSession = (projectId: string, sessionId: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const sessionMetaService = yield* SessionMetaService;
    const virtualConversationDatabase = yield* VirtualConversationDatabase;

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
            conversations: isBroken
              ? conversations
              : uniqBy(mergedConversations, (item) => {
                  switch (item.type) {
                    case "system":
                      return `${item.type}-${item.uuid}`;
                    case "assistant":
                      return `${item.type}-${item.message.id}`;
                    case "user":
                      return `${item.type}-${item.message.content}`;
                    case "summary":
                      return `${item.type}-${item.leafUuid}`;
                    case "x-error":
                      return `${item.type}-${item.lineNumber}-${item.line}`;
                    default:
                      item satisfies never;
                      throw new Error(`Unknown conversation type: ${item}`);
                  }
                }),
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
              firstCommand: null,
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
    const fs = yield* FileSystem.FileSystem;
    const sessionMetaService = yield* SessionMetaService;
    const virtualConversationDatabase = yield* VirtualConversationDatabase;

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

    // Process session files
    const sessionEffects = dirents
      .filter((entry) => entry.endsWith(".jsonl"))
      .map((entry) =>
        Effect.gen(function* () {
          const fullPath = resolve(claudeProjectPath, entry);
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
      .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());

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
            firstCommand: firstUserText ? parseCommandXml(firstUserText) : null,
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

export class SessionRepository extends Context.Tag("SessionRepository")<
  SessionRepository,
  {
    readonly getSession: typeof getSession;
    readonly getSessions: typeof getSessions;
  }
>() {
  static Live = Layer.succeed(this, {
    getSession,
    getSessions,
  });
}
