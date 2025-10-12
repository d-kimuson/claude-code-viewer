import { constants } from "node:fs";
import { access, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { claudeProjectsDirPath } from "../paths";
import type { Project } from "../types";
import { getProjectMeta } from "./getProjectMeta";
import { encodeProjectId } from "./id";

export const getProjects = async (): Promise<{ projects: Project[] }> => {
  try {
    // Check if the claude projects directory exists
    await access(claudeProjectsDirPath, constants.F_OK);
  } catch (_error) {
    // Directory doesn't exist, return empty array
    console.warn(
      `Claude projects directory not found at ${claudeProjectsDirPath}`,
    );
    return { projects: [] };
  }

  try {
    const dirents = await readdir(claudeProjectsDirPath, {
      withFileTypes: true,
    });
    const projects = await Promise.all(
      dirents
        .filter((d) => d.isDirectory())
        .map(async (d) => {
          const fullPath = resolve(claudeProjectsDirPath, d.name);
          const id = encodeProjectId(fullPath);

          return {
            id,
            claudeProjectPath: fullPath,
            meta: await getProjectMeta(fullPath),
          };
        }),
    );

    return {
      projects: projects.sort((a, b) => {
        return (
          (b.meta.lastModifiedAt?.getTime() ?? 0) -
          (a.meta.lastModifiedAt?.getTime() ?? 0)
        );
      }),
    };
  } catch (error) {
    console.error("Error reading projects:", error);
    return { projects: [] };
  }
};
