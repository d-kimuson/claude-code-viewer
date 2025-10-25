import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import * as ClaudeCodeVersion from "../models/ClaudeCodeVersion";
import { ClaudeCodeService } from "../services/ClaudeCodeService";

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;
  const claudeCodeService = yield* ClaudeCodeService;
  const context = yield* ApplicationContext;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const getClaudeCommands = (options: { projectId: string }) =>
    Effect.gen(function* () {
      const { projectId } = options;

      const { project } = yield* projectRepository.getProject(projectId);

      const globalCommands: string[] = yield* fs
        .readDirectory(context.claudeCodePaths.claudeCommandsDirPath)
        .pipe(
          Effect.map((items) =>
            items
              .filter((item) => item.endsWith(".md"))
              .map((item) => item.replace(/\.md$/, "")),
          ),
        )
        .pipe(
          Effect.match({
            onSuccess: (items) => items,
            onFailure: () => {
              return [];
            },
          }),
        );

      const projectCommands: string[] =
        project.meta.projectPath === null
          ? []
          : yield* fs
              .readDirectory(
                path.resolve(project.meta.projectPath, ".claude", "commands"),
              )
              .pipe(
                Effect.map((items) =>
                  items
                    .filter((item) => item.endsWith(".md"))
                    .map((item) => item.replace(/\.md$/, "")),
                ),
              )
              .pipe(
                Effect.match({
                  onSuccess: (items) => items,
                  onFailure: () => {
                    return [];
                  },
                }),
              );

      return {
        response: {
          globalCommands: globalCommands,
          projectCommands: projectCommands,
          defaultCommands: ["init", "compact", "security-review", "review"],
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
