import { Path } from "@effect/platform";
import { Effect } from "effect";
import { ApplicationContext } from "../../core/platform/services/ApplicationContext.ts";

export const getClaudeCodeViewerCacheDirPath = Effect.gen(function* () {
  const path = yield* Path.Path;
  const context = yield* ApplicationContext;
  const claudeCodePaths = yield* context.claudeCodePaths;
  const homeDirectory = path.dirname(claudeCodePaths.globalClaudeDirectoryPath);
  return path.resolve(homeDirectory, ".claude-code-viewer", "cache");
});
