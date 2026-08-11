import type { PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import { FileSystem, Path } from "@effect/platform";
import { Context, Data, Effect, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { ApplicationContext } from "../../platform/services/ApplicationContext.ts";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository.ts";
import { parseMcpListOutput } from "../functions/parseMcpListOutput.ts";
import { parseUserSettingsDefaultPermissionMode } from "../functions/parseUserSettingsDefaultPermissionMode.ts";
import * as ClaudeCode from "../models/ClaudeCode.ts";

class ProjectPathNotFoundError extends Data.TaggedError("ProjectPathNotFoundError")<{
  projectId: string;
}> {}

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;
  const applicationContext = yield* ApplicationContext;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const getUserDefaultPermissionMode = Effect.gen(function* () {
    const { globalClaudeDirectoryPath } = yield* applicationContext.claudeCodePaths;
    const settingsPath = path.join(globalClaudeDirectoryPath, "settings.json");

    const exists = yield* fs.exists(settingsPath);
    if (!exists) {
      return undefined;
    }

    const content = yield* fs.readFileString(settingsPath);
    return parseUserSettingsDefaultPermissionMode(content);
  }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

  const resolvePermissionMode = (permissionMode: PermissionMode | undefined) =>
    Effect.gen(function* () {
      if (permissionMode !== undefined) {
        return permissionMode;
      }
      return yield* getUserDefaultPermissionMode;
    });

  const getClaudeCodeMeta = () =>
    Effect.gen(function* () {
      const config = yield* ClaudeCode.Config;
      const defaultPermissionMode = yield* getUserDefaultPermissionMode;
      return { ...config, defaultPermissionMode };
    });

  const getAvailableFeatures = () =>
    Effect.gen(function* () {
      const config = yield* ClaudeCode.Config;
      const features = ClaudeCode.getAvailableFeatures(config.claudeCodeVersion);
      return features;
    });

  const getMcpList = (projectId: string) =>
    Effect.gen(function* () {
      const { project } = yield* projectRepository.getProject(projectId);
      if (project.meta.projectPath === null) {
        return yield* Effect.fail(new ProjectPathNotFoundError({ projectId }));
      }

      const output = yield* ClaudeCode.getMcpListOutput(project.meta.projectPath);
      return parseMcpListOutput(output);
    });

  return {
    getClaudeCodeMeta,
    getMcpList,
    getAvailableFeatures,
    getUserDefaultPermissionMode,
    resolvePermissionMode,
  };
});

export type IClaudeCodeService = InferEffect<typeof LayerImpl>;

export class ClaudeCodeService extends Context.Tag("ClaudeCodeService")<
  ClaudeCodeService,
  IClaudeCodeService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
