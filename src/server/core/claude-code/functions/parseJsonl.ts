import { ConversationSchema } from "../../../../lib/conversation-schema";
import type { ErrorJsonl, ExtendedConversation } from "../../types";

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
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(
        `[parseJsonl] Skipping malformed JSON line ${index + 1}: ${errorMessage}`,
      );
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
