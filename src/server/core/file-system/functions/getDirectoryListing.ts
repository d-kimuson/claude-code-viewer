import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

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

export const getDirectoryListing = async (
  rootPath: string,
  basePath = "/",
  showHidden = false,
): Promise<DirectoryListingResult> => {
  const normalizedBasePath =
    basePath === "/"
      ? ""
      : basePath.startsWith("/")
        ? basePath.slice(1)
        : basePath;
  const targetPath = resolve(rootPath, normalizedBasePath);

  if (!targetPath.startsWith(resolve(rootPath))) {
    throw new Error("Invalid path: outside root directory");
  }

  if (!existsSync(targetPath)) {
    return {
      entries: [],
      basePath: "/",
      currentPath: rootPath,
    };
  }

  try {
    const dirents = await readdir(targetPath, { withFileTypes: true });
    const entries: DirectoryEntry[] = [];

    if (normalizedBasePath !== "") {
      const parentPath = dirname(normalizedBasePath);
      entries.push({
        name: "..",
        type: "directory",
        path: parentPath === "." ? "" : parentPath,
      });
    }

    for (const dirent of dirents) {
      if (!showHidden && dirent.name.startsWith(".")) {
        continue;
      }

      const entryPath = normalizedBasePath
        ? join(normalizedBasePath, dirent.name)
        : dirent.name;

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
  } catch (error) {
    console.error("Error reading directory:", error);
    return {
      entries: [],
      basePath: normalizedBasePath || "/",
      currentPath: targetPath,
    };
  }
};
