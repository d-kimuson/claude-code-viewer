import { homedir } from "node:os";
import { resolve } from "node:path";
import { encodeProjectId } from "../src/server/core/project/functions/id";

// biome-ignore lint/complexity/useLiteralKeys: env var
export const globalClaudeDirectoryPath = process.env["GLOBAL_CLAUDE_DIR"]
  ? // biome-ignore lint/complexity/useLiteralKeys: env var
    resolve(process.env["GLOBAL_CLAUDE_DIR"])
  : resolve(homedir(), ".claude");

export const projectIds = {
  sampleProject: encodeProjectId(
    resolve(globalClaudeDirectoryPath, "projects", "sample-project"),
  ),
} as const;
