import { Context, Effect, Layer, Ref } from "effect";
import type { Conversation } from "../../../lib/conversation-schema";
import type { ErrorJsonl } from "../types";

/**
 * For interactively experience, handle sessions not already persisted to the filesystem.
 */
export class VirtualConversationDatabase extends Context.Tag(
  "VirtualConversationDatabase",
)<
  VirtualConversationDatabase,
  {
    readonly getProjectVirtualConversations: (
      projectId: string,
    ) => Effect.Effect<
      {
        projectId: string;
        sessionId: string;
        conversations: (Conversation | ErrorJsonl)[];
      }[]
    >;
    readonly getSessionVirtualConversation: (
      sessionId: string,
    ) => Effect.Effect<{
      projectId: string;
      sessionId: string;
      conversations: (Conversation | ErrorJsonl)[];
    } | null>;
    readonly createVirtualConversation: (
      projectId: string,
      sessionId: string,
      conversations: readonly (Conversation | ErrorJsonl)[],
    ) => Effect.Effect<void>;
    readonly deleteVirtualConversations: (
      sessionId: string,
    ) => Effect.Effect<void>;
  }
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const storageRef = yield* Ref.make<
        {
          projectId: string;
          sessionId: string;
          conversations: (Conversation | ErrorJsonl)[];
        }[]
      >([]);

      const getProjectVirtualConversations = (projectId: string) =>
        Effect.gen(function* () {
          const conversations = yield* Ref.get(storageRef);
          return conversations.filter(
            (conversation) => conversation.projectId === projectId,
          );
        });

      const getSessionVirtualConversation = (sessionId: string) =>
        Effect.gen(function* () {
          const conversations = yield* Ref.get(storageRef);
          return (
            conversations.find(
              (conversation) => conversation.sessionId === sessionId,
            ) ?? null
          );
        });

      const createVirtualConversation = (
        projectId: string,
        sessionId: string,
        createConversations: readonly (Conversation | ErrorJsonl)[],
      ) =>
        Effect.gen(function* () {
          yield* Ref.update(storageRef, (conversations) => {
            const existingRecord = conversations.find(
              (record) =>
                record.projectId === projectId &&
                record.sessionId === sessionId,
            );

            if (existingRecord === undefined) {
              return [
                ...conversations,
                {
                  projectId,
                  sessionId,
                  conversations: [...createConversations],
                },
              ];
            }

            existingRecord.conversations.push(...createConversations);
            return conversations;
          });
        });

      const deleteVirtualConversations = (sessionId: string) =>
        Effect.gen(function* () {
          yield* Ref.update(storageRef, (conversations) => {
            return conversations.filter((c) => c.sessionId !== sessionId);
          });
        });

      return {
        getProjectVirtualConversations,
        getSessionVirtualConversation,
        createVirtualConversation,
        deleteVirtualConversations,
      };
    }),
  );
}

export type IVirtualConversationDatabase = Context.Tag.Service<
  typeof VirtualConversationDatabase
>;
