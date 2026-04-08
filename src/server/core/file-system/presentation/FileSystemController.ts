import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Either, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { ApplicationContext } from "../../platform/services/ApplicationContext.ts";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository.ts";
import { getDirectoryListing } from "../functions/getDirectoryListing.ts";
import { getFileCompletion } from "../functions/getFileCompletion.ts";
import { getFileContentEffect } from "../functions/getFileContent.ts";

const LayerImpl = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const context = yield* ApplicationContext;
  const projectRepository = yield* ProjectRepository;

  const getFileCompletionRoute = (options: { projectId: string; basePath: string }) =>
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

      const result = yield* Effect.either(
        getFileCompletion(projectPath, basePath).pipe(
          Effect.provideService(Path.Path, path),
          Effect.provideService(FileSystem.FileSystem, fs),
        ),
      );
      if (Either.isLeft(result)) {
        yield* Effect.logError(`File completion error: ${String(result.left)}`);
        return {
          response: { error: "Failed to get file completion" },
          status: 500,
        } as const satisfies ControllerResponse;
      }

      return {
        response: result.right,
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getDirectoryListingRoute = (options: {
    currentPath?: string | undefined;
    showHidden?: boolean | undefined;
  }) =>
    Effect.gen(function* () {
      const { currentPath, showHidden = false } = options;
      const claudeCodePaths = yield* context.claudeCodePaths;

      const rootPath = path.dirname(claudeCodePaths.globalClaudeDirectoryPath);
      const defaultPath = rootPath;

      const targetPath = currentPath ?? defaultPath;
      const relativePath = targetPath.startsWith(rootPath)
        ? targetPath.slice(rootPath.length)
        : targetPath;
      const result = yield* Effect.either(
        getDirectoryListing(rootPath, relativePath, showHidden).pipe(
          Effect.provideService(Path.Path, path),
          Effect.provideService(FileSystem.FileSystem, fs),
        ),
      );

      if (Either.isLeft(result)) {
        yield* Effect.logError(`Directory listing error: ${String(result.left)}`);
        return {
          response: { error: "Failed to list directory" },
          status: 500,
        } as const satisfies ControllerResponse;
      }

      return {
        response: result.right,
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getFileContentRoute = (options: { projectId: string; filePath: string }) =>
    Effect.gen(function* () {
      const { projectId, filePath } = options;

      const { project } = yield* projectRepository.getProject(projectId);

      // Allow reading files from either the source project directory or the Claude
      // project data directory (e.g. ~/.claude/projects/.../memory/)
      const claudeProjectPath = project.claudeProjectPath;
      const sourceProjectPath = project.meta.projectPath;

      const projectRoot = filePath.startsWith(`${claudeProjectPath}/`)
        ? claudeProjectPath
        : sourceProjectPath;

      if (projectRoot === null) {
        return {
          response: {
            success: false,
            error: "PROJECT_PATH_NOT_SET",
            message: "Project path is not configured. Cannot read files without a project root.",
            filePath,
          },
          status: 400,
        } as const satisfies ControllerResponse;
      }

      const result = yield* getFileContentEffect(projectRoot, filePath).pipe(
        Effect.provideService(Path.Path, path),
        Effect.provideService(FileSystem.FileSystem, fs),
      );

      if (!result.success) {
        const statusCode = result.error === "NOT_FOUND" ? 404 : 400;
        return {
          response: result,
          status: statusCode,
        } as const satisfies ControllerResponse;
      }

      return {
        response: result,
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    getFileCompletionRoute,
    getDirectoryListingRoute,
    getFileContentRoute,
  };
});

export type IFileSystemController = InferEffect<typeof LayerImpl>;
export class FileSystemController extends Context.Tag("FileSystemController")<
  FileSystemController,
  IFileSystemController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
