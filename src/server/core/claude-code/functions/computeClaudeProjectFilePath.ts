import path from "node:path";
import { claudeProjectsDirPath } from "../../../lib/config/paths";

export function computeClaudeProjectFilePath(projectPath: string): string {
  return path.join(
    claudeProjectsDirPath,
    projectPath.replace(/\/$/, "").replace(/\//g, "-"),
  );
}
