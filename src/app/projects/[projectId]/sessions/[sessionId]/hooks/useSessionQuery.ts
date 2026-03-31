import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { sessionDetailQuery } from "../../../../../../lib/api/queries";
import type { Conversation } from "../../../../../../lib/conversation-schema";
import { createVirtualUserEntry } from "../../../../../../lib/virtual-messages/createVirtualUserEntry";
import { shouldRemoveVirtualMessage } from "../../../../../../lib/virtual-messages/shouldRemoveVirtualMessage";
import {
  getVirtualMessage,
  removeVirtualMessage,
} from "../../../../../../lib/virtual-messages/virtualMessageStore";

const filterConversations = (
  conversations: ReadonlyArray<
    Conversation | { type: "x-error"; line: string; lineNumber: number }
  >,
): Conversation[] =>
  conversations.filter((c): c is Conversation => c.type !== "x-error");

export const useSessionQuery = (projectId: string, sessionId: string) => {
  const query = useSuspenseQuery({
    queryKey: sessionDetailQuery(projectId, sessionId).queryKey,
    queryFn: async () => {
      const result = await sessionDetailQuery(projectId, sessionId).queryFn();

      const virtualMessage = getVirtualMessage(sessionId);

      // If server has no session yet, check virtual message store
      if (result.session === null) {
        if (virtualMessage) {
          const virtualEntry = createVirtualUserEntry(virtualMessage);
          return {
            session: {
              id: sessionId,
              jsonlFilePath: "",
              meta: {
                messageCount: 0,
                firstUserMessage: null,
                customTitle: null,
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
                modelName: null,
                prLinks: [],
              },
              conversations: [virtualEntry],
              lastModifiedAt: virtualMessage.sentAt,
            },
          };
        }

        return result;
      }

      // Server returned real data. If virtual message exists and real message
      // hasn't appeared yet, prepend virtual entry so the user sees their message.
      if (virtualMessage) {
        if (
          !shouldRemoveVirtualMessage(
            filterConversations(result.session.conversations),
            virtualMessage.sentAt,
          )
        ) {
          const virtualEntry = createVirtualUserEntry(virtualMessage);
          return {
            ...result,
            session: {
              ...result.session,
              conversations: [...result.session.conversations, virtualEntry],
            },
          };
        }
      }

      return result;
    },
    // Fallback polling in case SSE connection is lost
    // This ensures users don't need to manually refresh the page
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  // Clean up virtual message when real data appears
  // Filter out virtual entries (vc__ prefix) to avoid self-matching
  useEffect(() => {
    const virtualMessage = getVirtualMessage(sessionId);
    if (virtualMessage && query.data?.session) {
      const realConversations = filterConversations(
        query.data.session.conversations,
      ).filter((c) => !("uuid" in c && c.uuid.startsWith("vc__")));
      if (
        shouldRemoveVirtualMessage(realConversations, virtualMessage.sentAt)
      ) {
        removeVirtualMessage(sessionId);
      }
    }
  }, [sessionId, query.data]);

  return query;
};
