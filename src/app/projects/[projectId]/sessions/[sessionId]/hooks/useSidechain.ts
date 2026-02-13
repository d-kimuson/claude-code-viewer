import { useCallback, useMemo } from "react";
import type {
  Conversation,
  SidechainConversation,
} from "@/lib/conversation-schema";
import { taskToolInputSchema } from "../components/conversationList/AssistantConversationContent";

export const useSidechain = (conversations: Conversation[]) => {
  const sidechainConversations = conversations
    .filter(
      (conv) =>
        conv.type !== "summary" &&
        conv.type !== "file-history-snapshot" &&
        conv.type !== "queue-operation" &&
        conv.type !== "progress" &&
        conv.type !== "custom-title" &&
        conv.type !== "agent-name",
    )
    .filter((conv) => conv.isSidechain === true);

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

  const taskToolCallPromptSet = useMemo(() => {
    return new Set<string>(
      conversations
        .filter((conv) => conv.type === "assistant")
        .flatMap((conv) => [
          ...conv.message.content.filter(
            (content) => content.type === "tool_use",
          ),
        ])
        .flatMap((content) => {
          if (content.name !== "Task") {
            return [];
          }

          const input = taskToolInputSchema.safeParse(content.input);
          if (input.success === false) {
            return [];
          }

          return [input.data.prompt];
        }),
    );
  }, [conversations]);

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
    const groups = new Map<string, SidechainConversation[]>();

    for (const conv of sidechainConversations) {
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
        conversation.type === "file-history-snapshot" ||
        conversation.type === "queue-operation" ||
        conversation.type === "custom-title" ||
        conversation.type === "agent-name"
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

  const conversationAgentIdMap = useMemo(() => {
    return new Map<string, SidechainConversation>(
      sidechainConversations
        .filter(
          (conv) =>
            conv.type === "user" ||
            conv.type === "system" ||
            conv.type === "assistant",
        )
        .filter(
          (conv) => conv.parentUuid === null && conv.agentId !== undefined,
        )
        .map((conv) => [conv.agentId as string, conv] as const),
    );
  }, [sidechainConversations]);

  const getSidechainConversationByAgentId = useCallback(
    (agentId: string) => {
      return conversationAgentIdMap.get(agentId);
    },
    [conversationAgentIdMap],
  );

  const existsRelatedTaskCall = (prompt: string) => {
    return taskToolCallPromptSet.has(prompt);
  };

  return {
    isRootSidechain,
    getSidechainConversations,
    getSidechainConversationByPrompt,
    getSidechainConversationByAgentId,
    existsRelatedTaskCall,
  };
};
