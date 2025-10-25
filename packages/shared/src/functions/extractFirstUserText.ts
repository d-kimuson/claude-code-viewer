import type { ExtendedConversation } from "@claude-code-viewer/shared/conversation-schema/index";

export const extractFirstUserText = (
  conversation: ExtendedConversation,
): string | null => {
  if (conversation.type !== "user") {
    return null;
  }

  const firstUserText =
    typeof conversation.message.content === "string"
      ? conversation.message.content
      : (() => {
          const firstContent = conversation.message.content.at(0);
          if (firstContent === undefined) return null;
          if (typeof firstContent === "string") return firstContent;
          if (firstContent.type === "text") return firstContent.text;
          return null;
        })();

  return firstUserText;
};
