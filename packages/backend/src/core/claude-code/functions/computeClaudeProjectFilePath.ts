import { Path } from "@effect/platform";
import { Effect } from "effect";

export const computeClaudeProjectFilePath = (options: {
  projectPath: string;
  claudeProjectsDirPath: string;
}) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const { projectPath, claudeProjectsDirPath } = options;

    return path.join(
      claudeProjectsDirPath,
      projectPath.replace(/\/$/, "").replace(/\//g, "-"),
    );
  });
