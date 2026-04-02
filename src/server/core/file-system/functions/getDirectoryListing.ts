import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect } from "effect";

export type DirectoryEntry = {
  name: string;
  type: "file" | "directory";
  path: string;
};

export type DirectoryListingResult = {
  entries: DirectoryEntry[];
  basePath: string;
  currentPath: string;
};

export const getDirectoryListing = (
  rootPath: string,
  basePath = "/",
  showHidden = false,
): Effect.Effect<
  DirectoryListingResult,
  Error | PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const normalizedBasePath =
      basePath === "/" ? "" : basePath.startsWith("/") ? basePath.slice(1) : basePath;
    const resolvedRootPath = path.resolve(rootPath);
    const targetPath = path.resolve(rootPath, normalizedBasePath);

    if (!targetPath.startsWith(resolvedRootPath)) {
      return yield* Effect.fail(new Error("Invalid path: outside root directory"));
    }

    const exists = yield* fs.exists(targetPath);
    if (!exists) {
      return {
        entries: [],
        basePath: "/",
        currentPath: rootPath,
      };
    }

    const filenames = yield* fs.readDirectory(targetPath).pipe(
      Effect.catchAll((error) => {
        Effect.runFork(Effect.logError(`Error reading directory: ${String(error)}`));
        return Effect.succeed([] as string[]);
      }),
    );

    const entries: DirectoryEntry[] = [];

    if (normalizedBasePath !== "") {
      const parentPath = path.dirname(normalizedBasePath);
      entries.push({
        name: "..",
        type: "directory",
        path: parentPath === "." ? "" : parentPath,
      });
    }

    for (const filename of filenames) {
      if (!showHidden && filename.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(targetPath, filename);
      const fileInfo = yield* fs.stat(fullPath).pipe(Effect.catchAll(() => Effect.succeed(null)));
      if (fileInfo === null) {
        continue;
      }

      const entryPath = normalizedBasePath ? path.join(normalizedBasePath, filename) : filename;

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
      if (a.name === "..") return -1;
      if (b.name === "..") return 1;
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      entries,
      basePath: normalizedBasePath || "/",
      currentPath: targetPath,
    };
  });
