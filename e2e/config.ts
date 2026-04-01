import { homedir } from "node:os";
import { resolve } from "node:path";
import { encodeProjectId } from "../src/server/core/project/functions/id";

// biome-ignore lint/complexity/useLiteralKeys: env var
const globalClaudeDir = process.env["GLOBAL_CLAUDE_DIR"];
export const globalClaudeDirectoryPath =
  globalClaudeDir !== undefined && globalClaudeDir !== ""
    ? resolve(globalClaudeDir)
    : resolve(homedir(), ".claude");

export const projectIds = {
  sampleProject: encodeProjectId(resolve(globalClaudeDirectoryPath, "projects", "sample-project")),
} as const;
