import { FileSystem } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import { decodeSessionId } from "../../session/functions/id";

export interface ContextEntry {
  type: "user" | "assistant" | "system" | "tool" | "unknown";
  preview: string;
  timestamp: string;
  isTarget: boolean;
}

export interface ActivityContext {
  entries: ContextEntry[];
  sessionId: string;
  projectId: string;
}

const MAX_PREVIEW_LENGTH = 300;

function getEntryType(
  entry: unknown,
): "user" | "assistant" | "system" | "tool" | "unknown" {
  if (typeof entry !== "object" || entry === null) return "unknown";
  const typed = entry as {
    type?: string;
    message?: { content?: Array<{ type?: string }> };
  };
  const type = typed.type;

  // Check if it's a tool result (user message with tool_result content)
  if (type === "user" && Array.isArray(typed.message?.content)) {
    const hasToolResult = typed.message.content.some(
      (item) => typeof item === "object" && item?.type === "tool_result",
    );
    if (hasToolResult) return "tool";
  }

  switch (type) {
    case "user":
      return "user";
    case "assistant":
      return "assistant";
    case "system":
      return "system";
    default:
      return "unknown";
  }
}

function extractPreview(entry: unknown): string {
  if (typeof entry !== "object" || entry === null) return "";

  const typed = entry as {
    type?: string;
    message?: {
      content?:
        | string
        | Array<
            | string
            | {
                type?: string;
                text?: string;
                thinking?: string;
                content?: string;
                name?: string;
                input?: Record<string, unknown>;
              }
          >;
    };
  };

  if (!typed.message?.content) return "";

  const content = typed.message.content;

  if (typeof content === "string") {
    return content.slice(0, MAX_PREVIEW_LENGTH);
  }

  if (Array.isArray(content)) {
    // First pass: look for text content (prioritize visible text)
    for (const item of content) {
      if (typeof item === "string") {
        return item.slice(0, MAX_PREVIEW_LENGTH);
      }
      if (typeof item === "object" && item !== null) {
        // Text block - highest priority
        if (item.type === "text" && item.text) {
          return item.text.slice(0, MAX_PREVIEW_LENGTH);
        }
        // Tool result with content
        if (item.type === "tool_result" && item.content) {
          const preview =
            typeof item.content === "string"
              ? item.content
              : JSON.stringify(item.content);
          return `[Tool Result] ${preview.slice(0, MAX_PREVIEW_LENGTH - 14)}`;
        }
      }
    }

    // Second pass: tool use
    for (const item of content) {
      if (
        typeof item === "object" &&
        item !== null &&
        item.type === "tool_use"
      ) {
        return `[Tool: ${item.name}]`;
      }
    }

    // Third pass: thinking blocks (internal reasoning)
    for (const item of content) {
      if (
        typeof item === "object" &&
        item !== null &&
        item.type === "thinking"
      ) {
        if (item.thinking) {
          return `💭 ${item.thinking.slice(0, MAX_PREVIEW_LENGTH - 3)}`;
        }
        return "💭 Thinking...";
      }
    }
  }

  return "";
}

// Entry types to skip entirely (internal/infrastructure noise)
const SKIPPED_ENTRY_TYPES = new Set([
  "progress",
  "file-history-snapshot",
  "summary",
]);

function shouldSkipEntry(entry: unknown): boolean {
  if (typeof entry !== "object" || entry === null) return true;
  const typed = entry as { type?: string; message?: unknown };

  // Skip known internal entry types
  if (typed.type && SKIPPED_ENTRY_TYPES.has(typed.type)) {
    return true;
  }

  // Skip system entries with no message content
  if (typed.type === "system" && !typed.message) {
    return true;
  }

  return false;
}

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const getEntryContext = (options: {
    projectId: string;
    sessionId: string;
    timestamp: string;
    before?: number;
    after?: number;
  }): Effect.Effect<ActivityContext, Error> =>
    Effect.gen(function* () {
      const {
        projectId,
        sessionId,
        timestamp,
        before = 3,
        after = 3,
      } = options;

      const sessionPath = decodeSessionId(projectId, sessionId);

      // Check if session file exists
      const exists = yield* fs.exists(sessionPath);
      if (!exists) {
        return {
          entries: [],
          sessionId,
          projectId,
        };
      }

      // Read and parse session file
      const content = yield* fs.readFileString(sessionPath);
      const allLines = content.split("\n").filter((line) => line.trim());
      const conversations = parseJsonl(allLines.join("\n"));

      // Filter to meaningful entries and map to context entries
      const meaningfulEntries: Array<{
        entry: unknown;
        timestamp: string;
        index: number;
      }> = [];

      for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];
        if (shouldSkipEntry(conv)) continue;

        const preview = extractPreview(conv);
        if (!preview) continue;

        const entryTimestamp = (conv as { timestamp?: string }).timestamp ?? "";
        meaningfulEntries.push({
          entry: conv,
          timestamp: entryTimestamp,
          index: i,
        });
      }

      // Find the target entry by timestamp
      const targetIndex = meaningfulEntries.findIndex(
        (e) => e.timestamp === timestamp,
      );

      if (targetIndex === -1) {
        // Fallback: try to find closest timestamp
        const targetTime = new Date(timestamp).getTime();
        let closestIndex = 0;
        let closestDiff = Infinity;

        for (let i = 0; i < meaningfulEntries.length; i++) {
          const entry = meaningfulEntries[i];
          if (!entry) continue;
          const entryTime = new Date(entry.timestamp).getTime();
          const diff = Math.abs(entryTime - targetTime);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestIndex = i;
          }
        }

        // If no close match found, return empty
        if (closestDiff > 60000) {
          return {
            entries: [],
            sessionId,
            projectId,
          };
        }

        // Use closest entry
        const startIdx = Math.max(0, closestIndex - before);
        const endIdx = Math.min(
          meaningfulEntries.length - 1,
          closestIndex + after,
        );

        const contextEntries: ContextEntry[] = [];
        for (let i = startIdx; i <= endIdx; i++) {
          const e = meaningfulEntries[i];
          if (!e) continue;
          contextEntries.push({
            type: getEntryType(e.entry),
            preview: extractPreview(e.entry),
            timestamp: e.timestamp,
            isTarget: i === closestIndex,
          });
        }

        return {
          entries: contextEntries,
          sessionId,
          projectId,
        };
      }

      // Get surrounding entries
      const startIdx = Math.max(0, targetIndex - before);
      const endIdx = Math.min(
        meaningfulEntries.length - 1,
        targetIndex + after,
      );

      const contextEntries: ContextEntry[] = [];
      for (let i = startIdx; i <= endIdx; i++) {
        const e = meaningfulEntries[i];
        if (!e) continue;
        contextEntries.push({
          type: getEntryType(e.entry),
          preview: extractPreview(e.entry),
          timestamp: e.timestamp,
          isTarget: i === targetIndex,
        });
      }

      return {
        entries: contextEntries,
        sessionId,
        projectId,
      };
    }).pipe(
      Effect.catchAll(() =>
        Effect.succeed({
          entries: [],
          sessionId: options.sessionId,
          projectId: options.projectId,
        }),
      ),
    );

  return {
    getEntryContext,
  };
});

export type IActivityContextService = InferEffect<typeof LayerImpl>;

export class ActivityContextService extends Context.Tag(
  "ActivityContextService",
)<ActivityContextService, IActivityContextService>() {
  static Live = Layer.effect(this, LayerImpl);
}
