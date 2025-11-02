import { Command, FileSystem, Path } from "@effect/platform";
import { Context, Data, Duration, Effect, Either, Layer } from "effect";
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

      // Git will search parent directories for .git, so we don't need to check explicitly

      const command = Command.make("git", ...args).pipe(
        Command.workingDirectory(absoluteCwd),
        Command.env({
          PATH: yield* envService.getEnv("PATH"),
        }),
      );

      const result = yield* Effect.either(Command.string(command));

      if (Either.isLeft(result)) {
        return yield* Effect.fail(
          new GitCommandError({
            cwd: absoluteCwd,
            command: `git ${args.join(" ")}`,
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

  const stageFiles = (cwd: string, files: string[]) =>
    Effect.gen(function* () {
      if (files.length === 0) {
        return yield* Effect.fail(
          new GitCommandError({
            cwd,
            command: "git add (no files)",
          }),
        );
      }

      const result = yield* execGitCommand(["add", ...files], cwd);
      return result;
    });

  const commit = (cwd: string, message: string) =>
    Effect.gen(function* () {
      const trimmedMessage = message.trim();
      if (trimmedMessage.length === 0) {
        return yield* Effect.fail(
          new GitCommandError({
            cwd,
            command: "git commit (empty message)",
          }),
        );
      }

      console.log(
        "[GitService.commit] Committing with message:",
        trimmedMessage,
        "in",
        cwd,
      );
      const result = yield* execGitCommand(
        ["commit", "-m", trimmedMessage],
        cwd,
      );
      console.log("[GitService.commit] Commit result:", result);

      // Parse commit SHA from output
      // Git commit output format: "[branch SHA] commit message"
      const shaMatch = result.match(/\[.+\s+([a-f0-9]+)\]/);
      console.log("[GitService.commit] SHA match:", shaMatch);
      if (shaMatch?.[1]) {
        console.log(
          "[GitService.commit] Returning SHA from match:",
          shaMatch[1],
        );
        return shaMatch[1];
      }

      // Fallback: Get SHA from git log
      console.log(
        "[GitService.commit] No SHA match, falling back to rev-parse HEAD",
      );
      const sha = yield* execGitCommand(["rev-parse", "HEAD"], cwd);
      console.log(
        "[GitService.commit] Returning SHA from rev-parse:",
        sha.trim(),
      );
      return sha.trim();
    });

  const push = (cwd: string) =>
    Effect.gen(function* () {
      const branch = yield* getCurrentBranch(cwd);

      const absoluteCwd = path.resolve(cwd);

      // Use Command.exitCode to check success, as git push writes to stderr even on success
      const command = Command.make("git", "push", "origin", "HEAD").pipe(
        Command.workingDirectory(absoluteCwd),
        Command.env({
          PATH: yield* envService.getEnv("PATH"),
        }),
      );

      const exitCodeResult = yield* Effect.either(
        Command.exitCode(command).pipe(Effect.timeout(Duration.seconds(60))),
      );

      if (Either.isLeft(exitCodeResult)) {
        console.log("[GitService.push] Command failed or timeout");
        return yield* Effect.fail(
          new GitCommandError({
            cwd: absoluteCwd,
            command: "git push origin HEAD (timeout after 60s)",
          }),
        );
      }

      const exitCode = exitCodeResult.right;
      console.log("[GitService.push] Exit code:", exitCode);

      if (exitCode !== 0) {
        // Get stderr for error details
        const stderrLines = yield* Command.lines(
          Command.make("git", "push", "origin", "HEAD").pipe(
            Command.workingDirectory(absoluteCwd),
            Command.env({
              PATH: yield* envService.getEnv("PATH"),
            }),
            Command.stderr("inherit"),
          ),
        ).pipe(Effect.orElse(() => Effect.succeed([])));

        const stderr = Array.from(stderrLines).join("\n");
        console.log("[GitService.push] Failed with stderr:", stderr);

        return yield* Effect.fail(
          new GitCommandError({
            cwd: absoluteCwd,
            command: `git push origin HEAD - ${stderr}`,
          }),
        );
      }

      console.log("[GitService.push] Push succeeded");
      return { branch, output: "success" };
    });

  const getBranchHash = (cwd: string, branchName: string) =>
    Effect.gen(function* () {
      const result = yield* execGitCommand(["rev-parse", branchName], cwd).pipe(
        Effect.map((output) => output.trim().split("\n")[0] ?? null),
      );
      return result;
    });

  const getBranchNamesByCommitHash = (cwd: string, hash: string) =>
    Effect.gen(function* () {
      const result = yield* execGitCommand(
        ["branch", "--contains", hash, "--format=%(refname:short)"],
        cwd,
      );
      return result
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
    });

  const compareCommitHash = (
    cwd: string,
    targetHash: string,
    compareHash: string,
  ) =>
    Effect.gen(function* () {
      const aheadResult = yield* execGitCommand(
        ["rev-list", `${targetHash}..${compareHash}`],
        cwd,
      );
      const aheadCounts = aheadResult
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "").length;

      const behindResult = yield* execGitCommand(
        ["rev-list", `${compareHash}..${targetHash}`],
        cwd,
      );
      const behindCounts = behindResult
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "").length;

      if (aheadCounts === 0 && behindCounts === 0) {
        return "un-related" as const;
      }

      if (aheadCounts > 0) {
        return "ahead" as const;
      }

      if (behindCounts > 0) {
        return "behind" as const;
      }

      return "un-related" as const;
    });

  const getCommitsWithParent = (
    cwd: string,
    options: { offset: number; limit: number },
  ) =>
    Effect.gen(function* () {
      const { offset, limit } = options;
      const result = yield* execGitCommand(
        [
          "log",
          "-n",
          String(limit),
          "--skip",
          String(offset),
          "--graph",
          "--pretty=format:%h %p",
        ],
        cwd,
      );

      const lines = result
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");

      const commits: Array<{ current: string; parent: string }> = [];

      for (const line of lines) {
        const match = /^\* (?<current>.+) (?<parent>.+)$/.exec(line);
        if (match?.groups?.current && match.groups.parent) {
          commits.push({
            current: match.groups.current,
            parent: match.groups.parent,
          });
        }
      }

      return commits;
    });

  const findBaseBranch = (cwd: string, targetBranch: string) =>
    Effect.gen(function* () {
      let offset = 0;
      const limit = 20;

      while (offset < 100) {
        const commits = yield* getCommitsWithParent(cwd, { offset, limit });

        for (const commit of commits) {
          const branchNames = yield* getBranchNamesByCommitHash(
            cwd,
            commit.current,
          );

          if (!branchNames.includes(targetBranch)) {
            continue;
          }

          const otherBranchNames = branchNames.filter(
            (branchName) => branchName !== targetBranch,
          );

          if (otherBranchNames.length === 0) {
            continue;
          }

          for (const branchName of otherBranchNames) {
            const comparison = yield* compareCommitHash(
              cwd,
              targetBranch,
              branchName,
            );

            if (comparison === "behind") {
              return { branch: branchName, hash: commit.current };
            }
          }
        }

        offset += limit;
      }

      return null;
    });

  const getCommitsBetweenBranches = (
    cwd: string,
    baseBranch: string,
    targetBranch: string,
  ) =>
    Effect.gen(function* () {
      const result = yield* execGitCommand(
        [
          "log",
          `${baseBranch}..${targetBranch}`,
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
    stageFiles,
    commit,
    push,
    getBranchHash,
    getBranchNamesByCommitHash,
    compareCommitHash,
    getCommitsWithParent,
    findBaseBranch,
    getCommitsBetweenBranches,
  };
});

export type IGitService = InferEffect<typeof LayerImpl>;

export class GitService extends Context.Tag("GitService")<
  GitService,
  IGitService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
