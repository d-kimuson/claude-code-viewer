import { homedir } from "node:os";
import { Path } from "@effect/platform";
import { Effect, Context as EffectContext, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { EnvService } from "./EnvService";

const LayerImpl = Effect.gen(function* () {
  const path = yield* Path.Path;
  const envService = yield* EnvService;

  const globalClaudeDirectoryPath = yield* envService
    .getEnv("CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH")
    .pipe(
      Effect.map((envVar) =>
        envVar === undefined
          ? path.resolve(homedir(), ".claude")
          : path.resolve(envVar),
      ),
    );

  const claudeCodePaths = {
    globalClaudeDirectoryPath,
    claudeCommandsDirPath: path.resolve(globalClaudeDirectoryPath, "commands"),
    claudeProjectsDirPath: path.resolve(globalClaudeDirectoryPath, "projects"),
  } as const satisfies {
    globalClaudeDirectoryPath: string;
    claudeCommandsDirPath: string;
    claudeProjectsDirPath: string;
  };

  return {
    claudeCodePaths,
  };
});

export type IApplicationContext = InferEffect<typeof LayerImpl>;
export class ApplicationContext extends EffectContext.Tag("ApplicationContext")<
  ApplicationContext,
  IApplicationContext
>() {
  static Live = Layer.effect(this, LayerImpl);
}
