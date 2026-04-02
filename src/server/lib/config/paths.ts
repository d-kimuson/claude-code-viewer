/* oxlint-disable no-restricted-imports */
/* Exception: cache path constant still uses synchronous Node path composition. */
import { homedir } from "node:os";
import { resolve } from "node:path";

export const claudeCodeViewerCacheDirPath = resolve(homedir(), ".claude-code-viewer", "cache");
