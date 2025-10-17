import { Command, FileSystem, Path } from "@effect/platform";
import { Context, Data, Effect, Either, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { EnvService } from "../../platform/services/EnvService";
import { parseGitBranchesOutput } from "../functions/parseGitBranchesOutput";
import { parseGitCommitsOutput } from "../functions/parseGitCommitsOutput";

class NotARepositoryError extends Data.TaggedError("NotARepositoryError")<{
  cwd: string;
}> {}

class GitCommandError extends Data.TaggedError("GitCommandError")<{
  cwd: string;
  command: string;
}> {}

class DetachedHeadError extends Data.TaggedError("DetachedHeadError")<{
  cwd: string;
}> {}

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const envService = yield* EnvService;

  const execGitCommand = (args: string[], cwd: string) =>
    Effect.gen(function* () {
      const absoluteCwd = path.resolve(cwd);

      if (!(yield* fs.exists(absoluteCwd))) {
        return yield* Effect.fail(
          new NotARepositoryError({ cwd: absoluteCwd }),
        );
      }

      if (!(yield* fs.exists(path.resolve(absoluteCwd, ".git")))) {
        return yield* Effect.fail(
          new NotARepositoryError({ cwd: absoluteCwd }),
        );
      }

      const command = Command.string(
        Command.make("cd", absoluteCwd, "&&", "git", ...args).pipe(
          Command.env({
            PATH: yield* envService.getEnv("PATH"),
          }),
          Command.runInShell(true),
        ),
      );

      const result = yield* Effect.either(command);

      if (Either.isLeft(result)) {
        return yield* Effect.fail(
          new GitCommandError({
            cwd: absoluteCwd,
            command: command.toString(),
          }),
        );
      }

      return result.right;
    });

  const getBranches = (cwd: string) =>
    Effect.gen(function* () {
      const result = yield* execGitCommand(["branch", "-vv", "--all"], cwd);
      return parseGitBranchesOutput(result);
    });

  const getCurrentBranch = (cwd: string) =>
    Effect.gen(function* () {
      const currentBranch = yield* execGitCommand(
        ["branch", "--show-current"],
        cwd,
      ).pipe(Effect.map((result) => result.trim()));

      if (currentBranch === "") {
        return yield* Effect.fail(new DetachedHeadError({ cwd }));
      }

      return currentBranch;
    });

  const branchExists = (cwd: string, branchName: string) =>
    Effect.gen(function* () {
      const result = yield* Effect.either(
        execGitCommand(["branch", "--exists", branchName], cwd),
      );

      if (Either.isLeft(result)) {
        return false;
      }

      return true;
    });

  const getCommits = (cwd: string) =>
    Effect.gen(function* () {
      const result = yield* execGitCommand(
        [
          "log",
          "--oneline",
          "-n",
          "20",
          "--format=%H|%s|%an|%ad",
          "--date=iso",
        ],
        cwd,
      );
      return parseGitCommitsOutput(result);
    });

  return {
    getBranches,
    getCurrentBranch,
    branchExists,
    getCommits,
  };
});

export type IGitService = InferEffect<typeof LayerImpl>;

export class GitService extends Context.Tag("GitService")<
  GitService,
  IGitService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
