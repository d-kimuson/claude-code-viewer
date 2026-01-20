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

    // Helper to check valid agent file
    const isValidAgentFile = (filePath: string, expectedSessionId?: string) =>
      Effect.gen(function* () {
        const content = yield* fs.readFileString(filePath);
        const firstLine = content.split("\n")[0];
        if (!firstLine || firstLine.trim() === "") {
          return false;
        }

        try {
          const firstLineData = JSON.parse(firstLine);
          if (typeof firstLineData !== "object" || firstLineData === null) {
            return false;
          }

          // If expectedSessionId is provided, strictly check it.
          // Otherwise, just ensure it looks like a valid log entry (has a sessionId).
          if (expectedSessionId !== undefined) {
            return (
              "sessionId" in firstLineData &&
              firstLineData.sessionId === expectedSessionId
            );
          }

          return "sessionId" in firstLineData;
        } catch {
          return false;
        }
      }).pipe(Effect.catchAll(() => Effect.succeed(false)));

    const matchingFilePaths: string[] = [];

    // 1. Check legacy root directory
    const rootEntries = yield* fs.readDirectory(projectPath);
    const rootAgentFiles = rootEntries.filter(
      (filename) =>
        filename.startsWith("agent-") && filename.endsWith(".jsonl"),
    );

    for (const agentFile of rootAgentFiles) {
      const filePath = path.join(projectPath, agentFile);
      if (yield* isValidAgentFile(filePath, sessionId)) {
        matchingFilePaths.push(filePath);
      }
    }

    // 2. Check subagents directory: [projectPath]/[sessionId]/subagents
    const subagentsDir = path.join(projectPath, sessionId, "subagents");
    const subagentsDirExists = yield* fs.exists(subagentsDir);

    if (subagentsDirExists) {
      const subagentEntries = yield* fs.readDirectory(subagentsDir).pipe(
        Effect.catchAll(() => Effect.succeed([] as string[])), // Handle permission or other errors gracefully
      );

      const subagentFiles = subagentEntries.filter(
        (filename) =>
          filename.startsWith("agent-") && filename.endsWith(".jsonl"),
      );

      for (const agentFile of subagentFiles) {
        const filePath = path.join(subagentsDir, agentFile);
        // For subagents, we don't enforce matching sessionId because they have their own IDs.
        // We trust the directory structure.
        if (yield* isValidAgentFile(filePath, undefined)) {
          matchingFilePaths.push(filePath);
        }
      }
    }

    return matchingFilePaths;
  });
