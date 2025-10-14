import { homedir } from "node:os";
import { resolve } from "node:path";
import { env } from "../lib/env";

const GLOBAL_CLAUDE_DIR = env.get("GLOBAL_CLAUDE_DIR");

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
