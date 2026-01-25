import { FileSystem } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect } from "effect";

/**
 * Extracts the last non-empty line from a string content.
 * Handles both LF and CRLF line endings.
 *
 * @param content - The content to extract the last line from
 * @returns The last non-empty line, or empty string if no lines exist
 */
export const extractLastNonEmptyLine = (content: string): string => {
  // Split by newline, handling both LF and CRLF
  const lines = content.split(/\r?\n/);

  // Find the last non-empty line by iterating from the end
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line !== undefined && line.trim() !== "") {
      return line;
    }
  }

  return "";
};

/**
 * Reads the last non-empty line of a file.
 *
 * This function reads the entire file content and extracts the last non-empty line.
 * While simpler than seeking to the end of the file, this approach is reliable
 * and acceptable for typical JSONL session files which are monitored via SSE
 * and read infrequently on file change events.
 *
 * @param filePath - Absolute path to the file
 * @returns Effect that resolves to the last non-empty line of the file
 *
 * @example
 * ```typescript
 * const effect = readLastLine("/path/to/session.jsonl");
 * const lastLine = await Effect.runPromise(effect.pipe(Effect.provide(NodeContext.layer)));
 * ```
 */
export const readLastLine = (
  filePath: string,
): Effect.Effect<string, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Read the entire file content
    const content = yield* fs.readFileString(filePath);

    // Extract the last non-empty line
    return extractLastNonEmptyLine(content);
  });
