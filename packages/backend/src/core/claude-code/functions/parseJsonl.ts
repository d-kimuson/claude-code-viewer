import type {
  ErrorJsonl,
  ExtendedConversation,
} from "@claude-code-viewer/shared/conversation-schema/index";
import { ConversationSchema } from "@claude-code-viewer/shared/conversation-schema/index";

export const parseJsonl = (content: string): ExtendedConversation[] => {
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");

  return lines.map((line, index) => {
    const parsed = ConversationSchema.safeParse(JSON.parse(line));
    if (!parsed.success) {
      const errorData: ErrorJsonl = {
        type: "x-error",
        line,
        lineNumber: index + 1,
      };
      return errorData;
    }

    return parsed.data;
  });
};
