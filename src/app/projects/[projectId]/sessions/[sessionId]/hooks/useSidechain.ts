import { useCallback, useMemo } from "react";
import type {
  Conversation,
  SidechainConversation,
} from "@/lib/conversation-schema";

export const useSidechain = (conversations: Conversation[]) => {
  const sidechainConversations = conversations.filter(
    (conv) => conv.type !== "summary" && conv.type !== "file-history-snapshot",
  );

  const conversationMap = useMemo(() => {
    return new Map<string, SidechainConversation>(
      sidechainConversations.map((conv) => [conv.uuid, conv] as const),
    );
  }, [sidechainConversations]);

  const conversationPromptMap = useMemo(() => {
    return new Map<string, SidechainConversation>(
      sidechainConversations
        .filter((conv) => conv.type === "user")
        .filter(
          (conv) =>
            conv.parentUuid === null &&
            typeof conv.message.content === "string",
        )
        .map((conv) => [conv.message.content as string, conv] as const),
    );
  }, [sidechainConversations]);

  const getRootConversationRecursive = useCallback(
    (conversation: SidechainConversation): SidechainConversation => {
      if (conversation.parentUuid === null) {
        return conversation;
      }

      const parent = conversationMap.get(conversation.parentUuid);
      if (parent === undefined) {
        return conversation;
      }

      return getRootConversationRecursive(parent);
    },
    [conversationMap],
  );

  const sidechainConversationGroups = useMemo(() => {
    const filtered = sidechainConversations.filter(
      (conv) => conv.isSidechain === true,
    );

    const groups = new Map<string, SidechainConversation[]>();

    for (const conv of filtered) {
      const rootConversation = getRootConversationRecursive(conv);

      if (groups.has(rootConversation.uuid)) {
        groups.get(rootConversation.uuid)?.push(conv);
      } else {
        groups.set(rootConversation.uuid, [conv]);
      }
    }

    return groups;
  }, [sidechainConversations, getRootConversationRecursive]);

  const isRootSidechain = useCallback(
    (conversation: Conversation) => {
      if (
        conversation.type === "summary" ||
        conversation.type === "file-history-snapshot"
      ) {
        return false;
      }

      return sidechainConversationGroups.has(conversation.uuid);
    },
    [sidechainConversationGroups],
  );

  const getSidechainConversations = useCallback(
    (rootUuid: string) => {
      return sidechainConversationGroups.get(rootUuid) ?? [];
    },
    [sidechainConversationGroups],
  );

  const getSidechainConversationByPrompt = useCallback(
    (prompt: string) => {
      return conversationPromptMap.get(prompt);
    },
    [conversationPromptMap],
  );

  return {
    isRootSidechain,
    getSidechainConversations,
    getSidechainConversationByPrompt,
  };
};
