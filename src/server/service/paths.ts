import { homedir } from "node:os";
import { resolve } from "node:path";

// biome-ignore lint/complexity/useLiteralKeys: typescript restriction
const GLOBAL_CLAUDE_DIR = process.env["GLOBAL_CLAUDE_DIR"];

export const globalClaudeDirectoryPath =
  GLOBAL_CLAUDE_DIR === undefined
    ? resolve(homedir(), ".claude")
    : resolve(GLOBAL_CLAUDE_DIR);

export const claudeProjectsDirPath = resolve(
  globalClaudeDirectoryPath,
  "projects",
);

export const claudeCommandsDirPath = resolve(
  globalClaudeDirectoryPath,
  "commands",
);
