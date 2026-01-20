import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { remoteSessionQuery } from "@/lib/api/queries";
import type { Conversation } from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import type { ErrorJsonl } from "@/server/core/types";

export const useRemoteSession = (url: string | null) => {
  const query = useQuery({
    ...remoteSessionQuery(url ?? ""),
    enabled: url !== null && url.length > 0,
  });

  const conversations = useMemo(() => {
    if (!query.data) {
      return [];
    }
    return query.data.conversations as (Conversation | ErrorJsonl)[];
  }, [query.data]);

  const toolResultMap = useMemo(() => {
    const entries = conversations.flatMap((conversation) => {
      if (conversation.type !== "user") {
        return [];
      }

      if (typeof conversation.message.content === "string") {
        return [];
      }

      return conversation.message.content.flatMap((message) => {
        if (typeof message === "string") {
          return [];
        }

        if (message.type !== "tool_result") {
          return [];
        }

        return [[message.tool_use_id, message] as const];
      });
    });

    return new Map(entries);
  }, [conversations]);

  const getToolResult = useCallback(
    (toolUseId: string): ToolResultContent | undefined => {
      return toolResultMap.get(toolUseId);
    },
    [toolResultMap],
  );

  return {
    conversations,
    getToolResult,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};
