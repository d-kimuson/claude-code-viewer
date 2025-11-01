import { Command, FileSystem, Path } from "@effect/platform";
import { Context, Data, Duration, Effect, Either, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { EnvService } from "../../platform/services/EnvService";
import { parseGitBranchesOutput } from "../functions/parseGitBranchesOutput";
import { parseGitCommitsOutput } from "../functions/parseGitCommitsOutput";
import { parseLines } from "../functions/utils";

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

  const getFilteredBranches = (cwd: string) =>
    Effect.gen(function* () {
      // Get current branch
      const currentBranch = yield* getCurrentBranch(cwd);

      // Get reflog revisions for current branch
      const reflogResult = yield* execGitCommand(
        ["reflog", currentBranch],
        cwd,
      );
      const reflogLines = parseLines(reflogResult);
      const revisions: string[] = [];
      for (const line of reflogLines) {
        const match = line.match(/^([a-f0-9]+)\s/);
        if (match && typeof match[1] === "string") {
          revisions.push(match[1]);
        }
      }

      if (revisions.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // Get all branches
      const allBranches = yield* getBranches(cwd);

      // Check which branches contain the reflog revisions
      const filteredBranchNames = new Set<string>();
      for (const revision of revisions) {
        const branchesResult = yield* Effect.either(
          execGitCommand(["branch", "--contains", revision], cwd),
        );

        if (Either.isRight(branchesResult)) {
          const branchLines = parseLines(branchesResult.right);
          for (const line of branchLines) {
            const branchName = line.replace(/^\*?\s*/, "").trim();
            if (branchName) {
              filteredBranchNames.add(branchName);
            }
          }
        }
      }

      // Filter branches
      const filteredBranches = allBranches.data.filter((branch) =>
        filteredBranchNames.has(branch.name),
      );

      return {
        success: true,
        data: filteredBranches,
      };
    });

  const getFilteredCommits = (cwd: string) =>
    Effect.gen(function* () {
      // Get current branch
      const currentBranchResult = yield* Effect.either(getCurrentBranch(cwd));
      if (Either.isLeft(currentBranchResult)) {
        // If we can't determine current branch (e.g., detached HEAD),
        // return last 10 commits from git log as fallback
        const logResult = yield* execGitCommand(
          [
            "log",
            "--oneline",
            "-n",
            "10",
            "--format=%H|%s|%an|%ad",
            "--date=iso",
          ],
          cwd,
        );
        return parseGitCommitsOutput(logResult);
      }
      const currentBranch = currentBranchResult.right;

      // Get reflog revisions for current branch
      const reflogResult = yield* execGitCommand(
        ["reflog", currentBranch, "--format=%H|%s|%an|%ad", "--date=iso"],
        cwd,
      );

      return parseGitCommitsOutput(reflogResult);
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

  return {
    getBranches,
    getCurrentBranch,
    branchExists,
    getCommits,
    getFilteredBranches,
    getFilteredCommits,
    stageFiles,
    commit,
    push,
  };
});

export type IGitService = InferEffect<typeof LayerImpl>;

export class GitService extends Context.Tag("GitService")<
  GitService,
  IGitService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
