import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect } from "effect";

/**
 * Convert file path to command name by creating a colon-separated path
 * relative to the base directory.
 *
 * @param filePath - Absolute path to the .md file
 * @param baseDir - Base directory path (commands directory)
 * @returns Command name (e.g., "frontend:impl" for "baseDir/frontend/impl.md")
 *
 * @example
 * pathToCommandName("/base/commands/impl.md", "/base/commands") // => "impl"
 * pathToCommandName("/base/commands/frontend/impl.md", "/base/commands") // => "frontend:impl"
 */
export const pathToCommandName = (
  filePath: string,
  baseDir: string,
): string => {
  // Normalize base directory by removing trailing slash
  const normalizedBaseDir = baseDir.endsWith("/")
    ? baseDir.slice(0, -1)
    : baseDir;

  // Get relative path from base directory
  const relativePath = filePath.startsWith(normalizedBaseDir)
    ? filePath.slice(normalizedBaseDir.length + 1)
    : filePath;

  // Remove .md extension and convert path separators to colons
  return relativePath.replace(/\.md$/, "").replace(/\//g, ":");
};

/**
 * Recursively scan a directory for .md files and return them as command names.
 * Hidden files and directories (starting with .) are excluded.
 *
 * @param dirPath - Directory path to scan
 * @returns Array of command names (e.g., ["impl", "frontend:impl"])
 *
 * @example
 * // For directory structure:
 * // commands/
 * //   impl.md
 * //   frontend/
 * //     impl.md
 * scanCommandFilesRecursively("/path/to/commands")
 * // => ["impl", "frontend:impl"]
 */
export const scanCommandFilesRecursively = (
  dirPath: string,
): Effect.Effect<string[], never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    // Helper function to recursively scan directories
    const scanDirectory = (
      currentPath: string,
    ): Effect.Effect<
      string[],
      PlatformError,
      FileSystem.FileSystem | Path.Path
    > =>
      Effect.gen(function* () {
        // Check if directory exists
        const exists = yield* fs.exists(currentPath);
        if (!exists) {
          return [];
        }

        // Read directory contents
        const items = yield* fs.readDirectory(currentPath);

        // Process each item
        const results = yield* Effect.forEach(
          items,
          (item) =>
            Effect.gen(function* () {
              // Skip hidden files and directories
              if (item.startsWith(".")) {
                return [];
              }

              const itemPath = path.join(currentPath, item);
              const info = yield* fs.stat(itemPath);

              if (info.type === "Directory") {
                // Recursively scan subdirectory
                return yield* scanDirectory(itemPath);
              }
              if (info.type === "File" && item.endsWith(".md")) {
                // Convert file path to command name
                return [pathToCommandName(itemPath, dirPath)];
              }
              return [];
            }),
          { concurrency: "unbounded" },
        );

        // Flatten the results array
        return results.flat();
      });

    // Wrap in match to handle errors gracefully
    return yield* scanDirectory(dirPath).pipe(
      Effect.match({
        onSuccess: (items) => items,
        onFailure: () => [],
      }),
    );
  });
