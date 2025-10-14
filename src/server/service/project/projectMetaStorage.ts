import { statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { z } from "zod";
import { FileCacheStorage } from "../../lib/storage/FileCacheStorage";
import { InMemoryCacheStorage } from "../../lib/storage/InMemoryCacheStorage";
import { parseJsonl } from "../parseJsonl";
import type { ProjectMeta } from "../types";
import { decodeProjectId } from "./id";

class ProjectMetaStorage {
  private projectPathCache = FileCacheStorage.load(
    "project-path-cache",
    z.string().nullable(),
  );
  private projectMetaCache = new InMemoryCacheStorage<ProjectMeta>();

  public async getProjectMeta(projectId: string): Promise<ProjectMeta> {
    const cached = this.projectMetaCache.get(projectId);
    if (cached !== undefined) {
      return cached;
    }

    const claudeProjectPath = decodeProjectId(projectId);

    const dirents = await readdir(claudeProjectPath, { withFileTypes: true });
    const files = dirents
      .filter((d) => d.isFile() && d.name.endsWith(".jsonl"))
      .map(
        (d) =>
          ({
            fullPath: resolve(claudeProjectPath, d.name),
            stats: statSync(resolve(claudeProjectPath, d.name)),
          }) as const,
      )
      .sort((a, b) => {
        return a.stats.mtime.getTime() - b.stats.mtime.getTime();
      });

    let projectPath: string | null = null;

    for (const file of files) {
      projectPath = await this.extractProjectPathFromJsonl(file.fullPath);

      if (projectPath === null) {
        continue;
      }

      break;
    }

    const projectMeta: ProjectMeta = {
      projectName: projectPath ? basename(projectPath) : null,
      projectPath,
      sessionCount: files.length,
    };

    this.projectMetaCache.save(projectId, projectMeta);

    return projectMeta;
  }

  public invalidateProject(projectId: string) {
    this.projectMetaCache.invalidate(projectId);
  }

  private async extractProjectPathFromJsonl(
    filePath: string,
  ): Promise<string | null> {
    const cached = this.projectPathCache.get(filePath);
    if (cached !== undefined) {
      return cached;
    }

    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");

    let cwd: string | null = null;

    for (const line of lines) {
      const conversation = parseJsonl(line).at(0);

      if (
        conversation === undefined ||
        conversation.type === "summary" ||
        conversation.type === "x-error"
      ) {
        continue;
      }

      cwd = conversation.cwd;

      break;
    }

    if (cwd !== null) {
      this.projectPathCache.save(filePath, cwd);
    }

    return cwd;
  }
}

export const projectMetaStorage = new ProjectMetaStorage();
