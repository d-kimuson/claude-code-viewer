import { existsSync, statSync } from "node:fs";
import { access, constants, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { claudeProjectsDirPath } from "../paths";
import type { Project } from "../types";
import { decodeProjectId, encodeProjectId } from "./id";
import { projectMetaStorage } from "./projectMetaStorage";

export class ProjectRepository {
  public async getProject(projectId: string): Promise<{ project: Project }> {
    const fullPath = decodeProjectId(projectId);
    if (!existsSync(fullPath)) {
      throw new Error("Project not found");
    }

    const meta = await projectMetaStorage.getProjectMeta(projectId);

    return {
      project: {
        id: projectId,
        claudeProjectPath: fullPath,
        lastModifiedAt: statSync(fullPath).mtime,
        meta,
      },
    };
  }

  public async getProjects(): Promise<{ projects: Project[] }> {
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
              lastModifiedAt: statSync(fullPath).mtime,
              meta: await projectMetaStorage.getProjectMeta(id),
            };
          }),
      );

      return {
        projects: projects.sort((a, b) => {
          return (
            (b.lastModifiedAt ? b.lastModifiedAt.getTime() : 0) -
            (a.lastModifiedAt ? a.lastModifiedAt.getTime() : 0)
          );
        }),
      };
    } catch (error) {
      console.error("Error reading projects:", error);
      return { projects: [] };
    }
  }
}
