import type { QueueOperationEntry } from "./QueueOperationEntrySchema";

type EnqueueContent = Extract<
  QueueOperationEntry,
  { operation: "enqueue" }
>["content"];

/**
 * Normalizes queue operation content to a string for display.
 * Handles both legacy string format and new array format.
 *
 * @param content - Queue operation content (string or array)
 * @returns Normalized string representation
 */
export const normalizeQueueOperationContent = (
  content: EnqueueContent,
): string => {
  // Legacy format: string
  if (typeof content === "string") {
    return content;
  }

  // New format: array of content items
  return content
    .map((item) => {
      // Plain string in array
      if (typeof item === "string") {
        return item;
      }

      // Discriminate by type field
      if (item.type === "text") {
        return item.text;
      }

      if (item.type === "image") {
        return "[Image]";
      }

      if (item.type === "document") {
        return "[Document]";
      }

      if (item.type === "tool_result") {
        return "[Tool Result]";
      }

      // Exhaustiveness check
      const _exhaustive: never = item;
      return _exhaustive;
    })
    .join("\n");
};
