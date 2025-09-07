import { statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { parseJsonl } from "../parseJsonl";
import type { ProjectMeta } from "../types";

const projectPathCache = new Map<string, string | null>();

const extractProjectPathFromJsonl = async (filePath: string) => {
  const cached = projectPathCache.get(filePath);
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
    projectPathCache.set(filePath, cwd);
  }

  return cwd;
};

export const getProjectMeta = async (
  claudeProjectPath: string,
): Promise<ProjectMeta> => {
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
      return a.stats.ctime.getTime() - b.stats.ctime.getTime();
    });

  const lastModifiedUnixTime = files.at(-1)?.stats.ctime.getTime();

  let projectPath: string | null = null;

  for (const file of files) {
    projectPath = await extractProjectPathFromJsonl(file.fullPath);

    if (projectPath === null) {
      continue;
    }

    break;
  }

  const projectMeta: ProjectMeta = {
    projectName: projectPath ? basename(projectPath) : null,
    projectPath,
    lastModifiedAt: lastModifiedUnixTime
      ? new Date(lastModifiedUnixTime)
      : null,
    sessionCount: files.length,
  };

  return projectMeta;
};
