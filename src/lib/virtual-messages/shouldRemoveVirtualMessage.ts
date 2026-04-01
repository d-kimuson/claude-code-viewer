import type { Conversation } from "../conversation-schema/index.ts";

export const shouldRemoveVirtualMessage = (
  conversations: readonly Conversation[],
  sentAt: string,
): boolean => {
  return conversations.some((c) => c.type === "user" && c.timestamp >= sentAt);
};
