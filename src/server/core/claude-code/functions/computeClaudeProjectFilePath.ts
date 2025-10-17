import { Path } from "@effect/platform";
import { Effect } from "effect";
import { claudeProjectsDirPath } from "../../../lib/config/paths";

export const computeClaudeProjectFilePath = (projectPath: string) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;

    return path.join(
      claudeProjectsDirPath,
      projectPath.replace(/\/$/, "").replace(/\//g, "-"),
    );
  });
