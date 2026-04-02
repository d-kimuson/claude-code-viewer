import type { Conversation } from "@/lib/conversation-schema";
import type { ErrorJsonl } from "@/server/core/types";

export type RenderableConversationRow = {
  conversation: Conversation | ErrorJsonl;
  showTimestamp: boolean;
  rowKey: string;
};

const noTimestampConversationTypes = new Set<Conversation["type"]>([
  "summary",
  "progress",
  "queue-operation",
  "file-history-snapshot",
  "custom-title",
  "agent-name",
  "agent-setting",
]);

export const getConversationKey = (conversation: Conversation) => {
  if (conversation.type === "user") {
    return `user_${conversation.uuid}`;
  }

  if (conversation.type === "assistant") {
    return `assistant_${conversation.uuid}`;
  }

  if (conversation.type === "system") {
    return `system_${conversation.uuid}`;
  }

  if (conversation.type === "summary") {
    return `summary_${conversation.leafUuid}`;
  }

  if (conversation.type === "file-history-snapshot") {
    return `file-history-snapshot_${conversation.messageId}`;
  }

  if (conversation.type === "queue-operation") {
    return `queue-operation_${conversation.operation}_${conversation.sessionId}_${conversation.timestamp}`;
  }

  if (conversation.type === "progress") {
    return `progress_${conversation.uuid}`;
  }

  if (conversation.type === "custom-title") {
    return `custom-title_${conversation.sessionId}_${conversation.customTitle}`;
  }

  if (conversation.type === "agent-name") {
    return `agent-name_${conversation.sessionId}_${conversation.agentName}`;
  }

  if (conversation.type === "agent-setting") {
    return `agent-setting_${conversation.sessionId}_${conversation.agentSetting}`;
  }

  if (conversation.type === "pr-link") {
    return `pr-link_${conversation.sessionId}_${conversation.prNumber}`;
  }

  if (conversation.type === "last-prompt") {
    return `last-prompt_${conversation.sessionId}`;
  }

  conversation satisfies never;
  throw new Error("Unknown conversation type");
};

export const buildRenderableConversationRows = (
  conversations: readonly (Conversation | ErrorJsonl)[],
  shouldRenderConversation: (conversation: Conversation | ErrorJsonl) => boolean,
): RenderableConversationRow[] => {
  const rows: RenderableConversationRow[] = [];
  const keyOccurrenceMap = new Map<string, number>();

  const createUniqueRowKey = (baseKey: string): string => {
    const occurrence = keyOccurrenceMap.get(baseKey) ?? 0;
    keyOccurrenceMap.set(baseKey, occurrence + 1);
    return occurrence === 0 ? baseKey : `${baseKey}_${occurrence}`;
  };

  for (const conversation of conversations) {
    if (conversation.type === "x-error") {
      rows.push({
        conversation,
        showTimestamp: false,
        rowKey: createUniqueRowKey(`error_${conversation.lineNumber}`),
      });
      continue;
    }

    if (!shouldRenderConversation(conversation)) {
      continue;
    }

    rows.push({
      conversation,
      showTimestamp: !noTimestampConversationTypes.has(conversation.type),
      rowKey: createUniqueRowKey(getConversationKey(conversation)),
    });
  }

  return rows;
};
