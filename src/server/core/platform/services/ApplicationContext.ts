import { homedir } from "node:os";
import { Path } from "@effect/platform";
import { Effect, Context as EffectContext, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { CcvOptionsService } from "./CcvOptionsService";

export type ClaudeCodePaths = {
  globalClaudeDirectoryPath: string;
  claudeCommandsDirPath: string;
  claudeSkillsDirPath: string;
  claudeProjectsDirPath: string;
};

const LayerImpl = Effect.gen(function* () {
  const path = yield* Path.Path;
  const ccvOptionsService = yield* CcvOptionsService;

  const claudeCodePaths = Effect.gen(function* () {
    const globalClaudeDirectoryPath = yield* ccvOptionsService
      .getCcvOptions("claudeDir")
      .pipe(
        Effect.map((envVar) =>
          envVar === undefined
            ? path.resolve(homedir(), ".claude")
            : path.resolve(envVar),
        ),
      );

    return {
      globalClaudeDirectoryPath,
      claudeCommandsDirPath: path.resolve(
        globalClaudeDirectoryPath,
        "commands",
      ),
      claudeSkillsDirPath: path.resolve(globalClaudeDirectoryPath, "skills"),
      claudeProjectsDirPath: path.resolve(
        globalClaudeDirectoryPath,
        "projects",
      ),
    } as const satisfies ClaudeCodePaths;
  });

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
