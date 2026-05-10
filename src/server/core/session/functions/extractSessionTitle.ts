import type { ExtendedConversation } from "../../types.ts";

export const extractSessionTitle = (
  conversations: readonly ExtendedConversation[],
): string | null => {
  let aiTitle: string | null = null;
  let customTitle: string | null = null;

  for (const conversation of conversations) {
    if (conversation.type === "custom-title") {
      customTitle = conversation.customTitle;
    }

    if (conversation.type === "ai-title") {
      aiTitle = conversation.aiTitle;
    }
  }

  return customTitle ?? aiTitle;
};
