import { useCallback, useMemo } from "react";
import type { Conversation, SidechainConversation } from "@/lib/conversation-schema";
import {
  SUBAGENT_TOOL_NAMES,
  taskToolInputSchema,
} from "../components/conversationList/AssistantConversationContent";

export const useSidechain = (conversations: Conversation[]) => {
  const sidechainConversations = useMemo(
    () =>
      conversations
        .filter(
          (conv) =>
            conv.type !== "summary" &&
            conv.type !== "file-history-snapshot" &&
            conv.type !== "queue-operation" &&
            conv.type !== "progress" &&
            conv.type !== "custom-title" &&
            conv.type !== "agent-name" &&
            conv.type !== "agent-setting" &&
            conv.type !== "pr-link" &&
            conv.type !== "last-prompt" &&
            conv.type !== "permission-mode",
        )
        .filter((conv) => conv.isSidechain === true),
    [conversations],
  );

  const conversationMap = useMemo(() => {
    return new Map<string, SidechainConversation>(
      sidechainConversations.map((conv) => [conv.uuid, conv] as const),
    );
  }, [sidechainConversations]);

  const conversationPromptMap = useMemo(() => {
    const entries: Array<readonly [string, SidechainConversation]> = [];

    for (const conv of sidechainConversations) {
      if (conv.type !== "user" || conv.parentUuid !== null) {
        continue;
      }

      if (typeof conv.message.content !== "string") {
        continue;
      }

      entries.push([conv.message.content, conv] as const);
    }

    return new Map<string, SidechainConversation>(entries);
  }, [sidechainConversations]);

  const taskToolCallPromptSet = useMemo(() => {
    return new Set<string>(
      conversations
        .filter((conv) => conv.type === "assistant")
        .flatMap((conv) => conv.message.content.filter((content) => content.type === "tool_use"))
        .flatMap((content) => {
          if (!SUBAGENT_TOOL_NAMES.has(content.name)) {
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
        conversation.type === "agent-name" ||
        conversation.type === "agent-setting" ||
        conversation.type === "pr-link" ||
        conversation.type === "last-prompt" ||
        conversation.type === "permission-mode"
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
    const entries: Array<readonly [string, SidechainConversation]> = [];

    for (const conv of sidechainConversations) {
      if (conv.type !== "user" && conv.type !== "system" && conv.type !== "assistant") {
        continue;
      }

      if (conv.parentUuid !== null || conv.agentId === undefined) {
        continue;
      }

      entries.push([conv.agentId, conv] as const);
    }

    return new Map<string, SidechainConversation>(entries);
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
