import type { Conversation } from "@/lib/conversation-schema";

export const shouldRemoveVirtualMessage = (
  conversations: readonly Conversation[],
  sentAt: string,
): boolean => {
  return conversations.some((c) => c.type === "user" && c.timestamp >= sentAt);
};
