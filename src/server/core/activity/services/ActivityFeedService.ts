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

function getEntryType(
  entry: unknown,
): "user" | "assistant" | "system" | "tool" | "unknown" {
  if (typeof entry !== "object" || entry === null) return "unknown";
  const type = (entry as { type?: string }).type;
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
      content?: string | Array<{ type?: string; text?: string } | string>;
    };
  };

  if (!typed.message?.content) return "";

  const content = typed.message.content;

  if (typeof content === "string") {
    return content.slice(0, MAX_PREVIEW_LENGTH);
  }

  if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === "string") {
        return item.slice(0, MAX_PREVIEW_LENGTH);
      }
      if (
        typeof item === "object" &&
        item !== null &&
        item.type === "text" &&
        item.text
      ) {
        return item.text.slice(0, MAX_PREVIEW_LENGTH);
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
            const entry: ActivityEntry = {
              id: ulid(),
              projectId,
              sessionId,
              entryType: getEntryType(validation.data),
              preview: extractPreview(validation.data),
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
