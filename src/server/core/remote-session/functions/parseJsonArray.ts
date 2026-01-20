import { ConversationSchema } from "../../../../lib/conversation-schema";
import type { ErrorJsonl, ExtendedConversation } from "../../types";

export const parseJsonArray = (content: string): ExtendedConversation[] => {
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected an array");
  }

  return parsed.map((item, index) => {
    const validated = ConversationSchema.safeParse(item);
    if (!validated.success) {
      const errorData: ErrorJsonl = {
        type: "x-error",
        line: JSON.stringify(item),
        lineNumber: index + 1,
      };
      return errorData;
    }

    return validated.data;
  });
};
