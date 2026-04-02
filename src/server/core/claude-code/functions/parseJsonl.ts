import { ConversationSchema } from "../../../../lib/conversation-schema/index.ts";
import type { ErrorJsonl, ExtendedConversation } from "../../types.ts";

export const parseJsonl = (content: string): ExtendedConversation[] => {
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");

  return lines.map((line, index) => {
    // First, try to parse the JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      const errorData: ErrorJsonl = {
        type: "x-error",
        line,
        lineNumber: index + 1,
      };
      return errorData;
    }

    // Then validate with Zod schema
    const result = ConversationSchema.safeParse(parsed);
    if (!result.success) {
      const errorData: ErrorJsonl = {
        type: "x-error",
        line,
        lineNumber: index + 1,
      };
      return errorData;
    }

    return result.data;
  });
};
