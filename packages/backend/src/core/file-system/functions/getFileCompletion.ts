import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  FileCompletionEntry,
  FileCompletionResult,
} from "@claude-code-viewer/shared/types/fs";

/**
 * Get file and directory completions for a given project path
 * @param projectPath - The root project path
 * @param basePath - The relative path from project root (default: "/")
 * @returns File and directory entries at the specified path level
 */
export const getFileCompletion = async (
  projectPath: string,
  basePath = "/",
): Promise<FileCompletionResult> => {
  // Normalize basePath to prevent directory traversal
  const normalizedBasePath = basePath.startsWith("/")
    ? basePath.slice(1)
    : basePath;
  const targetPath = resolve(projectPath, normalizedBasePath);

  // Security check: ensure target path is within project directory
  if (!targetPath.startsWith(resolve(projectPath))) {
    throw new Error("Invalid path: outside project directory");
  }

  // Check if the target path exists
  if (!existsSync(targetPath)) {
    return {
      entries: [],
      basePath: normalizedBasePath,
      projectPath,
    };
  }

  try {
    const dirents = await readdir(targetPath, { withFileTypes: true });
    const entries: FileCompletionEntry[] = [];

    // Process each directory entry
    for (const dirent of dirents) {
      // Skip hidden files and directories (starting with .)
      if (dirent.name.startsWith(".")) {
        continue;
      }

      const entryPath = join(normalizedBasePath, dirent.name);

      if (dirent.isDirectory()) {
        entries.push({
          name: dirent.name,
          type: "directory",
          path: entryPath,
        });
      } else if (dirent.isFile()) {
        entries.push({
          name: dirent.name,
          type: "file",
          path: entryPath,
        });
      }
    }

    // Sort entries: directories first, then files, both alphabetically
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
  } catch (error) {
    console.error("Error reading directory:", error);
    return {
      entries: [],
      basePath: normalizedBasePath,
      projectPath,
    };
  }
};
