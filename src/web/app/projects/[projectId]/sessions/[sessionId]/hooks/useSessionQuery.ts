import { useSuspenseQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import type { Conversation } from "@/lib/conversation-schema";
import { sseAtom } from "@/lib/sse/store/sseAtom";
import { createVirtualUserEntry } from "@/lib/virtual-messages/createVirtualUserEntry";
import { shouldRemoveVirtualMessage } from "@/lib/virtual-messages/shouldRemoveVirtualMessage";
import {
  getVirtualMessage,
  removeVirtualMessage,
} from "@/lib/virtual-messages/virtualMessageStore";
import { sessionDetailQuery } from "@/web/lib/api/queries";

const filterConversations = (
  conversations: ReadonlyArray<
    Conversation | { type: "x-error"; line: string; lineNumber: number }
  >,
): Conversation[] => conversations.filter((c): c is Conversation => c.type !== "x-error");

export const useSessionQuery = (projectId: string, sessionId: string) => {
  const { isConnected: isSSEConnected } = useAtomValue(sseAtom);

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
      // hasn't appeared yet, append virtual entry so the user sees their message.
      if (virtualMessage) {
        if (
          shouldRemoveVirtualMessage(
            filterConversations(result.session.conversations),
            virtualMessage.sentAt,
          )
        ) {
          // For continue/resume VMs, clean up from store here since SessionsTab
          // doesn't handle them (the session already exists in the server list).
          if (!virtualMessage.isNewSession) {
            removeVirtualMessage(sessionId);
          }
        } else {
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
    // When SSE is connected, rely on SSE-triggered invalidations instead
    refetchInterval: isSSEConnected ? false : 30_000,
    refetchIntervalInBackground: false,
  });

  // Virtual message cleanup is handled by session list components
  // (SessionsTab, SessionPageMain) when the server session appears in the project list.
  // We don't clean up here because the session detail query refreshes before the
  // project session list, causing the virtual session to disappear from the sidebar prematurely.

  return query;
};
