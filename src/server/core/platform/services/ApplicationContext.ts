import { Path } from "@effect/platform";
import { Effect, Context as EffectContext, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { CcvOptionsService } from "./CcvOptionsService.ts";
import { EnvService } from "./EnvService.ts";

export type ClaudeCodePaths = {
  globalClaudeDirectoryPath: string;
  claudeCommandsDirPath: string;
  claudeSkillsDirPath: string;
  claudeAgentsDirPath: string;
  claudeProjectsDirPath: string;
};

const LayerImpl = Effect.gen(function* () {
  const path = yield* Path.Path;
  const ccvOptionsService = yield* CcvOptionsService;
  const envService = yield* EnvService;

  const claudeCodePaths = Effect.gen(function* () {
    const cliClaudeDir = yield* ccvOptionsService.getCcvOptions("claudeDir");
    const homeDirectory = yield* envService.getEnv("HOME");
    const globalClaudeDirectoryPath =
      cliClaudeDir === undefined
        ? path.resolve(homeDirectory ?? "/", ".claude")
        : path.resolve(cliClaudeDir);

    return {
      globalClaudeDirectoryPath,
      claudeCommandsDirPath: path.resolve(globalClaudeDirectoryPath, "commands"),
      claudeSkillsDirPath: path.resolve(globalClaudeDirectoryPath, "skills"),
      claudeAgentsDirPath: path.resolve(globalClaudeDirectoryPath, "agents"),
      claudeProjectsDirPath: path.resolve(globalClaudeDirectoryPath, "projects"),
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
