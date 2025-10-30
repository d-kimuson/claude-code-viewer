import { homedir } from "node:os";
import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import { getDirectoryListing } from "../functions/getDirectoryListing";
import { getFileCompletion } from "../functions/getFileCompletion";

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;

  const getFileCompletionRoute = (options: {
    projectId: string;
    basePath: string;
  }) =>
    Effect.gen(function* () {
      const { projectId, basePath } = options;

      const { project } = yield* projectRepository.getProject(projectId);

      if (project.meta.projectPath === null) {
        return {
          response: { error: "Project path not found" },
          status: 400,
        } as const satisfies ControllerResponse;
      }

      const projectPath = project.meta.projectPath;

      try {
        const result = yield* Effect.promise(() =>
          getFileCompletion(projectPath, basePath),
        );
        return {
          response: result,
          status: 200,
        } as const satisfies ControllerResponse;
      } catch (error) {
        console.error("File completion error:", error);
        return {
          response: { error: "Failed to get file completion" },
          status: 500,
        } as const satisfies ControllerResponse;
      }
    });

  const getDirectoryListingRoute = (options: {
    currentPath?: string | undefined;
    showHidden?: boolean | undefined;
  }) =>
    Effect.promise(async () => {
      const { currentPath, showHidden = false } = options;

      const rootPath = "/";
      const defaultPath = homedir();

      try {
        const targetPath = currentPath ?? defaultPath;
        const relativePath = targetPath.startsWith(rootPath)
          ? targetPath.slice(rootPath.length)
          : targetPath;

        const result = await getDirectoryListing(
          rootPath,
          relativePath,
          showHidden,
        );

        return {
          response: result,
          status: 200,
        } as const satisfies ControllerResponse;
      } catch (error) {
        console.error("Directory listing error:", error);
        return {
          response: { error: "Failed to list directory" },
          status: 500,
        } as const satisfies ControllerResponse;
      }
    });

  return {
    getFileCompletionRoute,
    getDirectoryListingRoute,
  };
});

export type IFileSystemController = InferEffect<typeof LayerImpl>;
export class FileSystemController extends Context.Tag("FileSystemController")<
  FileSystemController,
  IFileSystemController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
