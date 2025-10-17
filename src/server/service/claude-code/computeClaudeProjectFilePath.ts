import path from "node:path";
import { claudeProjectsDirPath } from "../paths";

export function computeClaudeProjectFilePath(projectPath: string): string {
  return path.join(
    claudeProjectsDirPath,
    projectPath.replace(/\/$/, "").replace(/\//g, "-"),
  );
}
