import { ConversationSchema } from "../../lib/conversation-schema";
import type { ErrorJsonl } from "./types";

export const parseJsonl = (content: string) => {
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
