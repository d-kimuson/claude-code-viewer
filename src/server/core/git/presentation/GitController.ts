import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import { getBranches } from "../functions/getBranches";
import { getCommits } from "../functions/getCommits";
import { getDiff } from "../functions/getDiff";

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;

  const getGitBranches = (options: { projectId: string }) =>
    Effect.gen(function* () {
      const { projectId } = options;

      const { project } = yield* projectRepository.getProject(projectId);

      if (project.meta.projectPath === null) {
        return {
          response: { error: "Project path not found" },
          status: 400,
        } as const satisfies ControllerResponse;
      }

      const projectPath = project.meta.projectPath;

      try {
        const result = yield* Effect.promise(() => getBranches(projectPath));
        return {
          response: result,
          status: 200,
        } as const satisfies ControllerResponse;
      } catch (error) {
        console.error("Get branches error:", error);
        if (error instanceof Error) {
          return {
            response: { error: error.message },
            status: 400,
          } as const satisfies ControllerResponse;
        }
        return {
          response: { error: "Failed to get branches" },
          status: 500,
        } as const satisfies ControllerResponse;
      }
    });

  const getGitCommits = (options: { projectId: string }) =>
    Effect.gen(function* () {
      const { projectId } = options;

      const { project } = yield* projectRepository.getProject(projectId);

      if (project.meta.projectPath === null) {
        return {
          response: { error: "Project path not found" },
          status: 400,
        } as const satisfies ControllerResponse;
      }

      const projectPath = project.meta.projectPath;

      try {
        const result = yield* Effect.promise(() => getCommits(projectPath));
        return {
          response: result,
          status: 200,
        } as const satisfies ControllerResponse;
      } catch (error) {
        console.error("Get commits error:", error);
        if (error instanceof Error) {
          return {
            response: { error: error.message },
            status: 400,
          } as const satisfies ControllerResponse;
        }
        return {
          response: { error: "Failed to get commits" },
          status: 500,
        } as const satisfies ControllerResponse;
      }
    });

  const getGitDiff = (options: {
    projectId: string;
    fromRef: string;
    toRef: string;
  }) =>
    Effect.gen(function* () {
      const { projectId, fromRef, toRef } = options;

      const { project } = yield* projectRepository.getProject(projectId);

      try {
        if (project.meta.projectPath === null) {
          return {
            response: { error: "Project path not found" },
            status: 400,
          } as const satisfies ControllerResponse;
        }

        const projectPath = project.meta.projectPath;

        const result = yield* Effect.promise(() =>
          getDiff(projectPath, fromRef, toRef),
        );
        return {
          response: result,
          status: 200,
        } as const satisfies ControllerResponse;
      } catch (error) {
        console.error("Get diff error:", error);
        if (error instanceof Error) {
          return {
            response: { error: error.message },
            status: 400,
          } as const satisfies ControllerResponse;
        }
        return {
          response: { error: "Failed to get diff" },
          status: 500,
        } as const satisfies ControllerResponse;
      }
    });

  return {
    getGitBranches,
    getGitCommits,
    getGitDiff,
  };
});

export type IGitController = InferEffect<typeof LayerImpl>;
export class GitController extends Context.Tag("GitController")<
  GitController,
  IGitController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
