import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import {
  type CommandInfo,
  scanCommandFilesWithMetadata,
  scanSkillFilesWithMetadata,
} from "../functions/scanCommandFiles";
import * as ClaudeCodeVersion from "../models/ClaudeCodeVersion";
import { ClaudeCodeService } from "../services/ClaudeCodeService";

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;
  const claudeCodeService = yield* ClaudeCodeService;
  const context = yield* ApplicationContext;
  // FileSystem and Path are required by scanCommandFilesRecursively
  yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const getClaudeCommands = (options: { projectId: string }) =>
    Effect.gen(function* () {
      const { projectId } = options;

      const { project } = yield* projectRepository.getProject(projectId);
      const features = yield* claudeCodeService.getAvailableFeatures();

      const globalCommands: CommandInfo[] = yield* scanCommandFilesWithMetadata(
        (yield* context.claudeCodePaths).claudeCommandsDirPath,
      );

      const projectCommands: CommandInfo[] =
        project.meta.projectPath === null
          ? []
          : yield* scanCommandFilesWithMetadata(
              path.resolve(project.meta.projectPath, ".claude", "commands"),
            );

      const globalSkills: CommandInfo[] = features.runSkillsDirectly
        ? yield* scanSkillFilesWithMetadata(
            (yield* context.claudeCodePaths).claudeSkillsDirPath,
          )
        : [];

      const projectSkills: CommandInfo[] =
        features.runSkillsDirectly && project.meta.projectPath !== null
          ? yield* scanSkillFilesWithMetadata(
              path.resolve(project.meta.projectPath, ".claude", "skills"),
            )
          : [];

      const defaultCommands: CommandInfo[] = [
        {
          name: "init",
          description: "Initialize Claude Code in current project",
          argumentHint: null,
        },
        {
          name: "compact",
          description: "Compact conversation history",
          argumentHint: null,
        },
        {
          name: "security-review",
          description: "Review code for security issues",
          argumentHint: null,
        },
        {
          name: "review",
          description: "Review code changes",
          argumentHint: null,
        },
      ];

      // Helper to extract command names for backward compatibility
      const toNames = (commands: CommandInfo[]) => commands.map((c) => c.name);

      return {
        response: {
          // New format: CommandInfo[] with metadata
          globalCommands,
          projectCommands,
          globalSkills,
          projectSkills,
          defaultCommands,
          // Legacy format: string[] for backward compatibility
          globalCommandsLegacy: toNames(globalCommands),
          projectCommandsLegacy: toNames(projectCommands),
          globalSkillsLegacy: toNames(globalSkills),
          projectSkillsLegacy: toNames(projectSkills),
          defaultCommandsLegacy: toNames(defaultCommands),
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getMcpListRoute = (options: { projectId: string }) =>
    Effect.gen(function* () {
      const { projectId } = options;
      const servers = yield* claudeCodeService.getMcpList(projectId);
      return {
        response: { servers },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getClaudeCodeMeta = () =>
    Effect.gen(function* () {
      const config = yield* claudeCodeService.getClaudeCodeMeta();
      return {
        response: {
          executablePath: config.claudeCodeExecutablePath,
          version: config.claudeCodeVersion
            ? ClaudeCodeVersion.versionText(config.claudeCodeVersion)
            : null,
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getAvailableFeatures = () =>
    Effect.gen(function* () {
      const features = yield* claudeCodeService.getAvailableFeatures();
      const featuresList = Object.entries(features).flatMap(([key, value]) => {
        return [
          {
            name: key as keyof typeof features,
            enabled: value,
          },
        ];
      });

      return {
        response: { features: featuresList },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    getClaudeCommands,
    getMcpListRoute,
    getClaudeCodeMeta,
    getAvailableFeatures,
  };
});

export type IClaudeCodeController = InferEffect<typeof LayerImpl>;
export class ClaudeCodeController extends Context.Tag("ClaudeCodeController")<
  ClaudeCodeController,
  IClaudeCodeController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
