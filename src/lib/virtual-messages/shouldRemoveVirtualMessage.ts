import type { Conversation } from "../conversation-schema/index.ts";

export const shouldRemoveVirtualMessage = (
  conversations: readonly Conversation[],
  sentAt: string,
  conversationCountAtCreation?: number,
): boolean => {
  // Primary check: a user message with timestamp >= sentAt means the real message arrived
  if (conversations.some((c) => c.type === "user" && c.timestamp >= sentAt)) {
    return true;
  }

  // Fallback: if the conversation count has grown beyond what was stored at VM creation,
  // the session has been updated (real message arrived but timestamp comparison failed
  // due to timing drift between browser and Claude Code CLI).
  if (
    conversationCountAtCreation !== undefined &&
    conversations.length > conversationCountAtCreation
  ) {
    return true;
  }

  return false;
};
