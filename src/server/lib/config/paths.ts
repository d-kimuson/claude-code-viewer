import { homedir } from "node:os";
import { resolve } from "node:path";

export const claudeCodeViewerCacheDirPath = resolve(
  homedir(),
  ".claude-code-viewer",
  "cache",
);
