import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect } from "effect";

export type FileCompletionEntry = {
  name: string;
  type: "file" | "directory";
  path: string;
};

export type FileCompletionResult = {
  entries: FileCompletionEntry[];
  basePath: string;
  projectPath: string;
};

/**
 * Get file and directory completions for a given project path
 * @param projectPath - The root project path
 * @param basePath - The relative path from project root (default: "/")
 * @returns File and directory entries at the specified path level
 */
export const getFileCompletion = (
  projectPath: string,
  basePath = "/",
): Effect.Effect<FileCompletionResult, Error | PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const normalizedBasePath = basePath.startsWith("/") ? basePath.slice(1) : basePath;
    const resolvedProjectPath = path.resolve(projectPath);
    const targetPath = path.resolve(projectPath, normalizedBasePath);

    if (!targetPath.startsWith(resolvedProjectPath)) {
      return yield* Effect.fail(new Error("Invalid path: outside project directory"));
    }

    const exists = yield* fs.exists(targetPath);
    if (!exists) {
      return {
        entries: [],
        basePath: normalizedBasePath,
        projectPath,
      };
    }

    const filenames = yield* fs.readDirectory(targetPath).pipe(
      Effect.catchAll((error) => {
        Effect.runFork(Effect.logError(`Error reading directory: ${String(error)}`));
        return Effect.succeed([] as string[]);
      }),
    );

    const entries: FileCompletionEntry[] = [];

    for (const filename of filenames) {
      if (filename.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(targetPath, filename);
      const fileInfo = yield* fs.stat(fullPath).pipe(Effect.catchAll(() => Effect.succeed(null)));
      if (fileInfo === null) {
        continue;
      }

      const entryPath =
        normalizedBasePath === "" ? filename : path.join(normalizedBasePath, filename);

      if (fileInfo.type === "Directory") {
        entries.push({
          name: filename,
          type: "directory",
          path: entryPath,
        });
      } else if (fileInfo.type === "File") {
        entries.push({
          name: filename,
          type: "file",
          path: entryPath,
        });
      }
    }

    entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      entries,
      basePath: normalizedBasePath,
      projectPath,
    };
  });
