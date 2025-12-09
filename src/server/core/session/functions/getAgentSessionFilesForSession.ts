import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect } from "effect";

/**
 * Discovers agent session files for a given sessionId.
 *
 * Agent session files follow the pattern `agent-*.jsonl` and contain
 * conversations where `isSidechain: true`. This function scans the project
 * directory to find all agent files that belong to the specified session.
 *
 * @param projectPath - Absolute path to the project directory
 * @param sessionId - The session ID to match against
 * @returns Effect that yields an array of absolute paths to matching agent files
 *
 * @example
 * ```typescript
 * const agentFiles = await Effect.runPromise(
 *   getAgentSessionFilesForSession("/path/to/project", "session-123")
 *     .pipe(Effect.provide(FileSystem.layer))
 * );
 * // Returns: ["/path/to/project/agent-hash-1.jsonl", "/path/to/project/agent-hash-2.jsonl"]
 * ```
 */
export const getAgentSessionFilesForSession = (
  projectPath: string,
  sessionId: string,
): Effect.Effect<string[], PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    // Read all files in the project directory
    const entries = yield* fs.readDirectory(projectPath);

    // Filter for agent files (agent-*.jsonl)
    const agentFiles = entries.filter(
      (filename) =>
        filename.startsWith("agent-") && filename.endsWith(".jsonl"),
    );

    // Check each agent file to see if it matches the sessionId
    const matchingFilePaths: string[] = [];

    for (const agentFile of agentFiles) {
      const filePath = path.join(projectPath, agentFile);

      // Try to read the file and check sessionId
      // If read fails or sessionId doesn't match, skip this file
      const maybeMatches = yield* Effect.gen(function* () {
        const content = yield* fs.readFileString(filePath);

        // Parse the first line to get sessionId
        const firstLine = content.split("\n")[0];
        if (!firstLine || firstLine.trim() === "") {
          return false;
        }

        // Try to parse the first line as JSON
        try {
          const firstLineData = JSON.parse(firstLine);

          // Check if sessionId matches
          if (
            typeof firstLineData === "object" &&
            firstLineData !== null &&
            "sessionId" in firstLineData &&
            firstLineData.sessionId === sessionId
          ) {
            return true;
          }
        } catch {
          // Invalid JSON, skip this file
          return false;
        }

        return false;
      }).pipe(
        Effect.catchAll(() => Effect.succeed(false)), // On any error, skip this file
      );

      if (maybeMatches) {
        matchingFilePaths.push(filePath);
      }
    }

    return matchingFilePaths;
  });
