import { stat } from "node:fs/promises";
import { Context, Effect, Layer, Ref } from "effect";
import { ulid } from "ulid";
import { ConversationSchema } from "../../../../lib/conversation-schema";
import type { InferEffect } from "../../../lib/effect/types";
import { encodeProjectIdFromSessionFilePath } from "../../project/functions/id";
import type { ActivityEntry } from "../types/ActivityEntry";

const RING_BUFFER_SIZE = 100;
const MAX_PREVIEW_LENGTH = 150;

interface ActivityFeedServiceInterface {
  readonly processFileChange: (
    filePath: string,
    sessionId: string,
  ) => Effect.Effect<ActivityEntry[]>;
  readonly getRecentEntries: (limit?: number) => Effect.Effect<ActivityEntry[]>;
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

// Extract file path from tool input
function extractFilePath(input: Record<string, unknown>): string | null {
  const path = input.file_path ?? input.path;
  if (typeof path === "string") {
    return path.split("/").pop() ?? path;
  }
  return null;
}

// Format tool use preview with structured information
function formatToolUsePreview(
  name: string,
  input?: Record<string, unknown>,
): string {
  if (!input) return `[Tool: ${name}]`;

  switch (name.toLowerCase()) {
    case "read": {
      const filePath = extractFilePath(input);
      return filePath ? `[Tool: Read] ${filePath}` : `[Tool: Read]`;
    }
    case "write": {
      const filePath = extractFilePath(input);
      return filePath ? `[Tool: Write] ${filePath}` : `[Tool: Write]`;
    }
    case "edit": {
      const filePath = extractFilePath(input);
      return filePath ? `[Tool: Edit] ${filePath}` : `[Tool: Edit]`;
    }
    case "bash": {
      const command = input.command;
      if (typeof command === "string") {
        const shortCmd =
          command.length > 60 ? `${command.slice(0, 60)}...` : command;
        return `[Tool: Bash] \`${shortCmd}\``;
      }
      return `[Tool: Bash]`;
    }
    case "grep": {
      const pattern = input.pattern;
      if (typeof pattern === "string") {
        return `[Tool: Grep] "${pattern}"`;
      }
      return `[Tool: Grep]`;
    }
    case "glob": {
      const pattern = input.pattern;
      if (typeof pattern === "string") {
        return `[Tool: Glob] ${pattern}`;
      }
      return `[Tool: Glob]`;
    }
    case "webfetch": {
      const url = input.url;
      if (typeof url === "string") {
        try {
          const domain = new URL(url).hostname;
          return `[Tool: WebFetch] ${domain}`;
        } catch {
          return `[Tool: WebFetch]`;
        }
      }
      return `[Tool: WebFetch]`;
    }
    default: {
      // Handle MCP tools
      if (name.startsWith("mcp__")) {
        const parts = name.slice(5).split("__");
        if (parts.length >= 2 && parts[0]) {
          const server = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
          const action = parts.slice(1).join("__");
          return `[Tool: ${server}: ${action}]`;
        }
      }
      return `[Tool: ${name}]`;
    }
  }
}

// Format tool result preview with error detection
function formatToolResultPreview(
  content: string | Array<unknown>,
  _toolUseId?: string,
  isError?: boolean,
): string {
  let textContent = "";

  if (typeof content === "string") {
    textContent = content;
  } else if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === "string") {
        textContent += item;
      } else if (typeof item === "object" && item !== null) {
        const typed = item as { type?: string; text?: string };
        if (typed.type === "text" && typed.text) {
          textContent += typed.text;
        }
      }
    }
  }

  // Check for errors
  const hasError =
    isError ?? /error|failed|exception|fatal|panic/i.test(textContent);
  const prefix = hasError ? "[Tool Result Error]" : "[Tool Result]";

  return `${prefix} ${textContent.slice(0, MAX_PREVIEW_LENGTH - prefix.length - 1)}`;
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
                content?: string | Array<unknown>;
                name?: string;
                input?: Record<string, unknown>;
                tool_use_id?: string;
                is_error?: boolean;
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
        // Tool result with content - format with error detection
        if (item.type === "tool_result" && item.content) {
          return formatToolResultPreview(
            item.content,
            item.tool_use_id,
            item.is_error,
          );
        }
      }
    }

    // Second pass: tool use - format with input details
    for (const item of content) {
      if (
        typeof item === "object" &&
        item !== null &&
        item.type === "tool_use" &&
        item.name
      ) {
        return formatToolUsePreview(item.name, item.input);
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
          // Show brief preview of thinking
          return `💭 ${item.thinking.slice(0, MAX_PREVIEW_LENGTH - 3)}`;
        }
        return "💭 Thinking...";
      }
    }
  }

  return "";
}

const LayerImpl = Effect.gen(function* () {
  // File positions: Map<filePath, bytesRead>
  const filePositionsRef = yield* Ref.make<Map<string, number>>(new Map());

  // Ring buffer for recent entries
  const ringBufferRef = yield* Ref.make<ActivityEntry[]>([]);

  // Position cleanup timer tracking
  const positionTimestampsRef = yield* Ref.make<Map<string, number>>(new Map());

  const cleanupStalePositions = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      const timestamps = yield* Ref.get(positionTimestampsRef);
      const positions = yield* Ref.get(filePositionsRef);

      const toDelete: string[] = [];
      for (const [path, timestamp] of timestamps) {
        if (timestamp < oneHourAgo) {
          toDelete.push(path);
        }
      }

      for (const path of toDelete) {
        timestamps.delete(path);
        positions.delete(path);
      }

      yield* Ref.set(positionTimestampsRef, timestamps);
      yield* Ref.set(filePositionsRef, positions);
    });

  const processFileChange = (
    filePath: string,
    sessionId: string,
  ): Effect.Effect<ActivityEntry[]> =>
    Effect.gen(function* () {
      // Run cleanup periodically (every call is fine for now, can optimize later)
      yield* cleanupStalePositions();

      const projectId = encodeProjectIdFromSessionFilePath(filePath);
      const positions = yield* Ref.get(filePositionsRef);
      const lastPosition = positions.get(filePath) ?? 0;

      // Get current file size
      const fileStat = yield* Effect.tryPromise({
        try: () => stat(filePath),
        catch: () => new Error(`Failed to stat file: ${filePath}`),
      });

      const currentSize = fileStat.size;

      // If file hasn't grown, nothing new to read
      if (currentSize <= lastPosition) {
        // Update timestamp even if no new content
        const timestamps = yield* Ref.get(positionTimestampsRef);
        timestamps.set(filePath, Date.now());
        yield* Ref.set(positionTimestampsRef, timestamps);
        return [];
      }

      // Read only the new portion of the file
      const newContent = yield* Effect.tryPromise({
        try: async () => {
          const buffer = Buffer.alloc(currentSize - lastPosition);
          const fileHandle = await (await import("node:fs/promises")).open(
            filePath,
            "r",
          );
          try {
            await fileHandle.read(buffer, 0, buffer.length, lastPosition);
            return buffer.toString("utf-8");
          } finally {
            await fileHandle.close();
          }
        },
        catch: () => new Error(`Failed to read file: ${filePath}`),
      });

      // Update position tracking
      positions.set(filePath, currentSize);
      yield* Ref.set(filePositionsRef, positions);

      const timestamps = yield* Ref.get(positionTimestampsRef);
      timestamps.set(filePath, Date.now());
      yield* Ref.set(positionTimestampsRef, timestamps);

      // Parse new lines
      const lines = newContent
        .trim()
        .split("\n")
        .filter((line) => line.trim() !== "");

      const newEntries: ActivityEntry[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const validation = ConversationSchema.safeParse(parsed);

          if (validation.success) {
            // Skip internal/infrastructure entries
            if (shouldSkipEntry(validation.data)) {
              continue;
            }

            const preview = extractPreview(validation.data);
            // Skip entries with no meaningful content
            if (!preview) {
              continue;
            }

            const entry: ActivityEntry = {
              id: ulid(),
              projectId,
              sessionId,
              entryType: getEntryType(validation.data),
              preview,
              timestamp:
                (validation.data as { timestamp?: string }).timestamp ??
                new Date().toISOString(),
              rawEntry: validation.data,
            };
            newEntries.push(entry);
          }
        } catch {
          // Skip malformed lines
        }
      }

      // Add to ring buffer
      if (newEntries.length > 0) {
        const buffer = yield* Ref.get(ringBufferRef);
        const updated = [...newEntries, ...buffer].slice(0, RING_BUFFER_SIZE);
        yield* Ref.set(ringBufferRef, updated);
      }

      return newEntries;
    }).pipe(Effect.catchAll(() => Effect.succeed([] as ActivityEntry[])));

  const getRecentEntries = (
    limit = RING_BUFFER_SIZE,
  ): Effect.Effect<ActivityEntry[]> =>
    Effect.gen(function* () {
      const buffer = yield* Ref.get(ringBufferRef);
      return buffer.slice(0, Math.min(limit, buffer.length));
    });

  return {
    processFileChange,
    getRecentEntries,
  } satisfies ActivityFeedServiceInterface;
});

export type IActivityFeedService = InferEffect<typeof LayerImpl>;

export class ActivityFeedService extends Context.Tag("ActivityFeedService")<
  ActivityFeedService,
  IActivityFeedService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
