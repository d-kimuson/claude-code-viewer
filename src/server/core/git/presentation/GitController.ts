import { Context, Effect, Either, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import { getDiff } from "../functions/getDiff";
import type { CommitErrorCode, PushErrorCode } from "../schema";
import { GitService } from "../services/GitService";

const LayerImpl = Effect.gen(function* () {
  const gitService = yield* GitService;
  const projectRepository = yield* ProjectRepository;

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

  const commitFiles = (options: {
    projectId: string;
    files: string[];
    message: string;
  }) =>
    Effect.gen(function* () {
      const { projectId, files, message } = options;

      const { project } = yield* projectRepository.getProject(projectId);
      if (project.meta.projectPath === null) {
        console.log("[GitController.commitFiles] Project path is null");
        return {
          response: { error: "Project path not found" },
          status: 400,
        } as const satisfies ControllerResponse;
      }

      const projectPath = project.meta.projectPath;
      console.log("[GitController.commitFiles] Project path:", projectPath);

      // Stage files
      console.log("[GitController.commitFiles] Staging files...");
      const stageResult = yield* Effect.either(
        gitService.stageFiles(projectPath, files),
      );
      if (Either.isLeft(stageResult)) {
        console.log(
          "[GitController.commitFiles] Stage failed:",
          stageResult.left,
        );
        return {
          response: {
            success: false,
            error: "Failed to stage files",
            errorCode: "GIT_COMMAND_ERROR" as CommitErrorCode,
            details: stageResult.left.message,
          },
          status: 200,
        } as const satisfies ControllerResponse;
      }
      console.log("[GitController.commitFiles] Stage succeeded");

      // Commit
      console.log("[GitController.commitFiles] Committing...");
      const commitResult = yield* Effect.either(
        gitService.commit(projectPath, message),
      );
      if (Either.isLeft(commitResult)) {
        console.log(
          "[GitController.commitFiles] Commit failed:",
          commitResult.left,
        );
        const error = commitResult.left;
        const errorMessage =
          "_tag" in error && error._tag === "GitCommandError"
            ? error.command
            : "message" in error
              ? String(error.message)
              : "Unknown error";
        const isHookFailure = errorMessage.includes("hook");
        return {
          response: {
            success: false,
            error: isHookFailure ? "Pre-commit hook failed" : "Commit failed",
            errorCode: (isHookFailure
              ? "HOOK_FAILED"
              : "GIT_COMMAND_ERROR") as CommitErrorCode,
            details: errorMessage,
          },
          status: 200,
        } as const satisfies ControllerResponse;
      }

      console.log(
        "[GitController.commitFiles] Commit succeeded, SHA:",
        commitResult.right,
      );

      return {
        response: {
          success: true,
          commitSha: commitResult.right,
          filesCommitted: files.length,
          message,
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const pushCommits = (options: { projectId: string }) =>
    Effect.gen(function* () {
      const { projectId } = options;

      console.log("[GitController.pushCommits] Request:", { projectId });

      const { project } = yield* projectRepository.getProject(projectId);
      if (project.meta.projectPath === null) {
        console.log("[GitController.pushCommits] Project path is null");
        return {
          response: { error: "Project path not found" },
          status: 400,
        } as const satisfies ControllerResponse;
      }

      const projectPath = project.meta.projectPath;
      console.log("[GitController.pushCommits] Project path:", projectPath);

      // Push
      console.log("[GitController.pushCommits] Pushing...");
      const pushResult = yield* Effect.either(gitService.push(projectPath));

      if (Either.isLeft(pushResult)) {
        console.log(
          "[GitController.pushCommits] Push failed:",
          pushResult.left,
        );
        const error = pushResult.left;
        const errorMessage =
          "_tag" in error && error._tag === "GitCommandError"
            ? error.command
            : "message" in error
              ? String(error.message)
              : "Unknown error";

        const errorCode = parsePushError(errorMessage);
        return {
          response: {
            success: false,
            error: getPushErrorMessage(errorCode),
            errorCode,
            details: errorMessage,
          },
          status: 200,
        } as const satisfies ControllerResponse;
      }

      console.log("[GitController.pushCommits] Push succeeded");

      return {
        response: {
          success: true,
          remote: "origin",
          branch: pushResult.right.branch,
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const commitAndPush = (options: {
    projectId: string;
    files: string[];
    message: string;
  }) =>
    Effect.gen(function* () {
      const { projectId, files, message } = options;

      console.log("[GitController.commitAndPush] Request:", {
        projectId,
        files,
        message,
      });

      // First, commit
      const commitResult = yield* commitFiles({ projectId, files, message });

      if (commitResult.status !== 200 || !commitResult.response.success) {
        console.log(
          "[GitController.commitAndPush] Commit failed:",
          commitResult,
        );
        return commitResult; // Return commit error
      }

      const commitSha = commitResult.response.commitSha;
      console.log(
        "[GitController.commitAndPush] Commit succeeded, SHA:",
        commitSha,
      );

      // Then, push
      const pushResult = yield* pushCommits({ projectId });

      if (pushResult.status !== 200 || !pushResult.response.success) {
        console.log(
          "[GitController.commitAndPush] Push failed, partial failure:",
          pushResult,
        );
        // Partial failure: commit succeeded, push failed
        return {
          response: {
            success: false,
            commitSucceeded: true,
            commitSha,
            error: pushResult.response.error,
            errorCode: pushResult.response.errorCode,
            details: pushResult.response.details,
          },
          status: 200,
        } as const satisfies ControllerResponse;
      }

      console.log("[GitController.commitAndPush] Both operations succeeded");

      // Full success
      return {
        response: {
          success: true,
          commitSha,
          filesCommitted: files.length,
          message,
          remote: pushResult.response.remote,
          branch: pushResult.response.branch,
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getCurrentRevisions = (options: { projectId: string }) =>
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

      // Get current branch
      const currentBranchResult = yield* Effect.either(
        gitService.getCurrentBranch(projectPath),
      );

      if (Either.isLeft(currentBranchResult)) {
        return {
          response: {
            success: false,
          },
          status: 200,
        } as const satisfies ControllerResponse;
      }

      const currentBranch = currentBranchResult.right;

      // Find base branch
      const baseBranchResult = yield* Effect.either(
        gitService.findBaseBranch(projectPath, currentBranch),
      );

      // Get all branches to extract branch details
      const allBranchesResult = yield* Effect.either(
        gitService.getBranches(projectPath),
      );

      if (Either.isLeft(allBranchesResult)) {
        return {
          response: {
            success: false,
          },
          status: 200,
        } as const satisfies ControllerResponse;
      }

      const allBranches = allBranchesResult.right.data;

      // Find current branch details
      const currentBranchDetails = allBranches.find(
        (branch) => branch.name === currentBranch,
      );

      // Find base branch details if exists
      let baseBranchDetails: (typeof allBranches)[number] | undefined;
      if (Either.isRight(baseBranchResult) && baseBranchResult.right !== null) {
        const baseBranchName = baseBranchResult.right.branch;
        baseBranchDetails = allBranches.find(
          (branch) => branch.name === baseBranchName,
        );
      }

      // Get commits if base branch exists
      let commits: Array<{
        sha: string;
        message: string;
        author: string;
        date: string;
      }> = [];

      if (Either.isRight(baseBranchResult) && baseBranchResult.right !== null) {
        const baseBranchHash = baseBranchResult.right.hash;
        const commitsResult = yield* Effect.either(
          gitService.getCommitsBetweenBranches(
            projectPath,
            baseBranchHash,
            "HEAD",
          ),
        );

        if (Either.isRight(commitsResult)) {
          commits = commitsResult.right.data;
        }
      }

      return {
        response: {
          success: true,
          data: {
            baseBranch: baseBranchDetails ?? null,
            currentBranch: currentBranchDetails ?? null,
            head: currentBranchDetails?.commit ?? null,
            commits,
          },
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    getGitDiff,
    commitFiles,
    pushCommits,
    commitAndPush,
    getCurrentRevisions,
  };
});

// Helper functions for push error handling
function parsePushError(stderr: string): PushErrorCode {
  if (stderr.includes("no upstream") || stderr.includes("has no upstream")) {
    return "NO_UPSTREAM";
  }
  if (
    stderr.includes("non-fast-forward") ||
    stderr.includes("failed to push some refs")
  ) {
    return "NON_FAST_FORWARD";
  }
  if (
    stderr.includes("Authentication failed") ||
    stderr.includes("Permission denied")
  ) {
    return "AUTH_FAILED";
  }
  if (stderr.includes("Could not resolve host")) {
    return "NETWORK_ERROR";
  }
  if (stderr.includes("timeout") || stderr.includes("timed out")) {
    return "TIMEOUT";
  }
  return "GIT_COMMAND_ERROR";
}

function getPushErrorMessage(code: PushErrorCode): string {
  const messages: Record<PushErrorCode, string> = {
    NO_UPSTREAM:
      "Branch has no upstream. Run: git push --set-upstream origin <branch>",
    NON_FAST_FORWARD: "Remote has diverged. Pull changes first before pushing.",
    AUTH_FAILED:
      "Authentication failed. Check your SSH keys or HTTPS credentials.",
    NETWORK_ERROR: "Network error. Check your internet connection.",
    TIMEOUT:
      "Push operation timed out after 60 seconds. Retry or check network.",
    GIT_COMMAND_ERROR: "Git command failed. Check details.",
    PROJECT_NOT_FOUND: "Project not found.",
    NOT_A_REPOSITORY: "Not a git repository.",
  };
  return messages[code];
}

export type IGitController = InferEffect<typeof LayerImpl>;
export class GitController extends Context.Tag("GitController")<
  GitController,
  IGitController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
