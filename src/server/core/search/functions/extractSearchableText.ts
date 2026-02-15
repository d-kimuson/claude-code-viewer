import type { Conversation } from "../../../../lib/conversation-schema";
import type { ExtendedConversation } from "../../types";

/**
 * Extracts searchable text from a conversation entry.
 * Returns the user prompt or assistant response text.
 */
export const extractSearchableText = (
  conversation: ExtendedConversation,
): string | null => {
  if (conversation.type === "x-error") {
    return null;
  }

  if (conversation.type === "user") {
    return extractUserText(conversation);
  }

  if (conversation.type === "assistant") {
    return extractAssistantText(conversation);
  }

  if (conversation.type === "custom-title") {
    return conversation.customTitle;
  }

  if (conversation.type === "agent-name") {
    return null;
  }

  return null;
};

const extractUserText = (
  entry: Extract<Conversation, { type: "user" }>,
): string => {
  const content = entry.message.content;

  if (typeof content === "string") {
    return content;
  }

  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if ("text" in item && typeof item.text === "string") return item.text;
      return "";
    })
    .filter(Boolean)
    .join(" ");
};

const extractAssistantText = (
  entry: Extract<Conversation, { type: "assistant" }>,
): string => {
  return entry.message.content
    .filter((item): item is { type: "text"; text: string } => {
      return item.type === "text" && "text" in item;
    })
    .map((item) => item.text)
    .join(" ");
};
