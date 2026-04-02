import { Command, FileSystem, Path } from "@effect/platform";
import { Context, Data, Duration, Effect, Either, Layer } from "effect";
import parseGitDiff, { type AnyChunk, type AnyFileChange } from "parse-git-diff";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { EnvService } from "../../platform/services/EnvService.ts";
import { parseGitBranchesOutput } from "../functions/parseGitBranchesOutput.ts";
import { parseGitCommitsOutput } from "../functions/parseGitCommitsOutput.ts";
import { parseLines, stripAnsiColors } from "../functions/text.ts";
import type {
  GitComparisonResult,
  GitDiff,
  GitDiffFile,
  GitDiffHunk,
  GitDiffLine,
} from "../types.ts";

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

class GitInvalidRefError extends Data.TaggedError("GitInvalidRefError")<{
  ref: string;
}> {}

class GitInvalidDiffRefError extends Data.TaggedError("GitInvalidDiffRefError")<{
  refText: string;
}> {}

class GitDiffParseError extends Data.TaggedError("GitDiffParseError")<{
  reason: string;
}> {}

/** Validates that a git ref (branch name, hash, etc.) is safe to pass as a command argument */
const isValidGitRef = (ref: string): boolean =>
  ref.length > 0 && !ref.startsWith("-") && !ref.includes("\0");

const validateGitRef = (ref: string) =>
  isValidGitRef(ref) ? Effect.void : Effect.fail(new GitInvalidRefError({ ref }));

const extractDiffRef = (refText: string) =>
  Effect.gen(function* () {
    const [group, ref] = refText.split(":");

    if (group !== undefined && ref !== undefined) {
      return ref;
    }

    if (refText === "HEAD") {
      return "HEAD";
    }

    if (refText === "working") {
      return undefined;
    }

    return yield* Effect.fail(new GitInvalidDiffRefError({ refText }));
  });

const convertToGitDiffFile = (
  fileChange: AnyFileChange,
  fileStats: Map<string, { additions: number; deletions: number }>,
): GitDiffFile => {
  let filePath: string;
  let status: GitDiffFile["status"];
  let oldPath: string | undefined;

  switch (fileChange.type) {
    case "AddedFile":
      filePath = fileChange.path;
      status = "added";
      break;
    case "DeletedFile":
      filePath = fileChange.path;
      status = "deleted";
      break;
    case "RenamedFile":
      filePath = fileChange.pathAfter;
      oldPath = fileChange.pathBefore;
      status = "renamed";
      break;
    case "ChangedFile":
      filePath = fileChange.path;
      status = "modified";
      break;
    default:
      filePath = "";
      status = "modified";
  }

  const stats = fileStats.get(filePath) ??
    fileStats.get(oldPath ?? "") ?? { additions: 0, deletions: 0 };

  return {
    filePath,
    status,
    additions: stats.additions,
    deletions: stats.deletions,
    oldPath,
  };
};

const convertToGitDiffHunk = (chunk: AnyChunk): GitDiffHunk => {
  if (chunk.type !== "Chunk") {
    return {
      oldStart: 0,
      oldCount: 0,
      newStart: 0,
      newCount: 0,
      header: "",
      lines: [],
    };
  }

  const lines: GitDiffLine[] = [];

  for (const change of chunk.changes) {
    let line: GitDiffLine;

    switch (change.type) {
      case "AddedLine":
        line = {
          type: "added",
          content: change.content,
          newLineNumber: change.lineAfter,
        };
        break;
      case "DeletedLine":
        line = {
          type: "deleted",
          content: change.content,
          oldLineNumber: change.lineBefore,
        };
        break;
      case "UnchangedLine":
        line = {
          type: "context",
          content: change.content,
          oldLineNumber: change.lineBefore,
          newLineNumber: change.lineAfter,
        };
        break;
      case "MessageLine":
        line = {
          type: "context",
          content: change.content,
        };
        break;
      default:
        line = {
          type: "context",
          content: "",
        };
    }

    lines.push(line);
  }

  return {
    oldStart: chunk.fromFileRange.start,
    oldCount: chunk.fromFileRange.lines,
    newStart: chunk.toFileRange.start,
    newCount: chunk.toFileRange.lines,
    header: `@@ -${chunk.fromFileRange.start},${chunk.fromFileRange.lines} +${chunk.toFileRange.start},${chunk.toFileRange.lines} @@${chunk.context !== undefined && chunk.context !== "" ? ` ${chunk.context}` : ""}`,
    lines,
  };
};

const parseFallbackDiffFiles = (
  diffOutput: string,
  fileStats: Map<string, { additions: number; deletions: number }>,
): GitDiffFile[] => {
  const sections = diffOutput
    .split(/^diff --git /m)
    .map((section) => section.trim())
    .filter((section) => section !== "");

  return sections.flatMap((section) => {
    const lines = section.split("\n");
    const header = lines[0];
    if (header === undefined) {
      return [];
    }

    const headerMatch = header.match(/^a\/(.+?) b\/(.+)$/);
    if (!headerMatch) {
      return [];
    }

    const oldPathFromHeader = headerMatch[1];
    const newPathFromHeader = headerMatch[2];
    if (oldPathFromHeader === undefined || newPathFromHeader === undefined) {
      return [];
    }

    const renameFromLine = lines.find((line) => line.startsWith("rename from "));
    const renameToLine = lines.find((line) => line.startsWith("rename to "));
    const deleted = lines.some((line) => line.startsWith("deleted file mode"));
    const added = lines.some((line) => line.startsWith("new file mode"));

    const oldPath =
      renameFromLine !== undefined ? renameFromLine.replace("rename from ", "") : oldPathFromHeader;
    const filePath =
      renameToLine !== undefined ? renameToLine.replace("rename to ", "") : newPathFromHeader;

    const status: GitDiffFile["status"] = deleted
      ? "deleted"
      : renameFromLine !== undefined && renameToLine !== undefined
        ? "renamed"
        : added
          ? "added"
          : "modified";

    const stats = fileStats.get(filePath) ??
      fileStats.get(oldPath) ?? { additions: 0, deletions: 0 };

    return [
      {
        filePath,
        status,
        additions: stats.additions,
        deletions: stats.deletions,
        ...(status === "renamed" ? { oldPath } : {}),
      },
    ];
  });
};

const createUntrackedFileDiff = (filePath: string, content: string): GitDiff => {
  const lines = content.split("\n");

  const diffLines: GitDiffLine[] = lines.map((line, index) => ({
    type: "added",
    content: line,
    newLineNumber: index + 1,
  }));

  const file: GitDiffFile = {
    filePath,
    status: "added",
    additions: lines.length,
    deletions: 0,
  };

  const hunk: GitDiffHunk = {
    oldStart: 0,
    oldCount: 0,
    newStart: 1,
    newCount: lines.length,
    header: `@@ -0,0 +1,${lines.length} @@`,
    lines: diffLines,
  };

  return {
    file,
    hunks: [hunk],
  };
};

const createEmptyComparisonResult = (): GitComparisonResult => {
  return {
    diffs: [],
    files: [],
    summary: {
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    },
  };
};

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const envService = yield* EnvService;

  const execGitCommand = (args: string[], cwd: string) =>
    Effect.gen(function* () {
      const absoluteCwd = path.resolve(cwd);

      if (!(yield* fs.exists(absoluteCwd))) {
        return yield* Effect.fail(new NotARepositoryError({ cwd: absoluteCwd }));
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
      const currentBranch = yield* execGitCommand(["branch", "--show-current"], cwd).pipe(
        Effect.map((result) => result.trim()),
      );

      if (currentBranch === "") {
        return yield* Effect.fail(new DetachedHeadError({ cwd }));
      }

      return currentBranch;
    });

  const branchExists = (cwd: string, branchName: string) =>
    Effect.gen(function* () {
      yield* validateGitRef(branchName);
      const result = yield* Effect.either(execGitCommand(["branch", "--exists", branchName], cwd));

      if (Either.isLeft(result)) {
        return false;
      }

      return true;
    });

  const getCommits = (cwd: string) =>
    Effect.gen(function* () {
      const result = yield* execGitCommand(
        ["log", "--oneline", "-n", "20", "--format=%H|%s|%an|%ad", "--date=iso"],
        cwd,
      );
      return parseGitCommitsOutput(result);
    });

  const getUntrackedFiles = (cwd: string) =>
    Effect.gen(function* () {
      const statusOutput = yield* execGitCommand(
        ["status", "--untracked-files=all", "--short"],
        cwd,
      );
      return parseLines(statusOutput)
        .map((line) => stripAnsiColors(line))
        .filter((line) => line.startsWith("??"))
        .map((line) => line.slice(3));
    });

  const getDiff = (cwd: string, fromRefText: string, toRefText: string) =>
    Effect.gen(function* () {
      const fromRef = yield* extractDiffRef(fromRefText);
      const toRef = yield* extractDiffRef(toRefText);

      if (fromRef === toRef) {
        return createEmptyComparisonResult();
      }

      if (fromRef === undefined) {
        return yield* Effect.fail(new GitInvalidDiffRefError({ refText: fromRefText }));
      }

      yield* validateGitRef(fromRef);
      if (toRef !== undefined) {
        yield* validateGitRef(toRef);
      }

      const commandArgs = toRef === undefined ? [fromRef] : [fromRef, toRef];

      const numstatOutput = yield* execGitCommand(["diff", "--numstat", ...commandArgs, "--"], cwd);
      const diffOutput = yield* execGitCommand(["diff", "--unified=5", ...commandArgs, "--"], cwd);

      try {
        const fileStats = new Map<string, { additions: number; deletions: number }>();
        const numstatLines = parseLines(numstatOutput);

        for (const line of numstatLines) {
          const parts = line.split("\t");
          if (
            parts.length >= 3 &&
            parts[0] !== undefined &&
            parts[0] !== "" &&
            parts[1] !== undefined &&
            parts[1] !== "" &&
            parts[2] !== undefined &&
            parts[2] !== ""
          ) {
            const additions = parts[0] === "-" ? 0 : parseInt(parts[0], 10);
            const deletions = parts[1] === "-" ? 0 : parseInt(parts[1], 10);
            const filePath = parts[2];
            fileStats.set(filePath, { additions, deletions });
          }
        }

        const parsedDiff = parseGitDiff(diffOutput);
        const fallbackFiles = parseFallbackDiffFiles(diffOutput, fileStats);

        const files: GitDiffFile[] = [];
        const diffs: GitDiff[] = [];
        let totalAdditions = 0;
        let totalDeletions = 0;

        for (const fileChange of parsedDiff.files) {
          const file = convertToGitDiffFile(fileChange, fileStats);
          files.push(file);

          const hunks: GitDiffHunk[] = [];
          for (const chunk of fileChange.chunks) {
            const hunk = convertToGitDiffHunk(chunk);
            hunks.push(hunk);
          }

          diffs.push({
            file,
            hunks,
          });

          totalAdditions += file.additions;
          totalDeletions += file.deletions;
        }

        for (const fallbackFile of fallbackFiles) {
          const alreadyIncluded = files.some(
            (file) =>
              file.filePath === fallbackFile.filePath && file.oldPath === fallbackFile.oldPath,
          );
          if (alreadyIncluded) {
            continue;
          }

          files.push(fallbackFile);
          diffs.push({
            file: fallbackFile,
            hunks: [],
          });
          totalAdditions += fallbackFile.additions;
          totalDeletions += fallbackFile.deletions;
        }

        if (toRef === undefined) {
          const untrackedFiles = yield* getUntrackedFiles(cwd);

          for (const untrackedFile of untrackedFiles) {
            const fullPath = path.resolve(cwd, untrackedFile);
            const fileContentResult = yield* Effect.either(fs.readFileString(fullPath));

            if (Either.isLeft(fileContentResult)) {
              continue;
            }

            const untrackedDiff = createUntrackedFileDiff(untrackedFile, fileContentResult.right);
            files.push(untrackedDiff.file);
            diffs.push(untrackedDiff);
            totalAdditions += untrackedDiff.file.additions;
          }
        }

        return {
          files,
          diffs,
          summary: {
            totalFiles: files.length,
            totalAdditions,
            totalDeletions,
          },
        };
      } catch (error) {
        return yield* Effect.fail(
          new GitDiffParseError({
            reason: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      }
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

      const result = yield* execGitCommand(["add", "--", ...files], cwd);
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

      const result = yield* execGitCommand(["commit", "-m", trimmedMessage], cwd);

      // Parse commit SHA from output
      // Git commit output format: "[branch SHA] commit message"
      const shaMatch = result.match(/\[.+\s+([a-f0-9]+)\]/);
      yield* Effect.logDebug(`[GitService.commit] SHA match: ${shaMatch?.[1] ?? "none"}`);
      if (shaMatch?.[1] !== undefined && shaMatch[1] !== "") {
        return shaMatch[1];
      }

      // Fallback: Get SHA from git log
      yield* Effect.logDebug("[GitService.commit] Falling back to rev-parse HEAD");
      const sha = yield* execGitCommand(["rev-parse", "HEAD"], cwd);
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
        return yield* Effect.fail(
          new GitCommandError({
            cwd: absoluteCwd,
            command: "git push origin HEAD (timeout after 60s)",
          }),
        );
      }

      const exitCode = exitCodeResult.right;

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

        return yield* Effect.fail(
          new GitCommandError({
            cwd: absoluteCwd,
            command: `git push origin HEAD - ${stderr}`,
          }),
        );
      }

      return { branch, output: "success" };
    });

  const getBranchHash = (cwd: string, branchName: string) =>
    Effect.gen(function* () {
      yield* validateGitRef(branchName);
      const result = yield* execGitCommand(["rev-parse", branchName], cwd).pipe(
        Effect.map((output) => output.trim().split("\n")[0] ?? null),
      );
      return result;
    });

  const getBranchNamesByCommitHash = (cwd: string, hash: string) =>
    Effect.gen(function* () {
      yield* validateGitRef(hash);
      const result = yield* execGitCommand(
        ["branch", "--contains", hash, "--format=%(refname:short)"],
        cwd,
      );
      return result
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
    });

  const compareCommitHash = (cwd: string, targetHash: string, compareHash: string) =>
    Effect.gen(function* () {
      yield* validateGitRef(targetHash);
      yield* validateGitRef(compareHash);
      const aheadResult = yield* execGitCommand(["rev-list", `${targetHash}..${compareHash}`], cwd);
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

  const getCommitsWithParent = (cwd: string, options: { offset: number; limit: number }) =>
    Effect.gen(function* () {
      const { offset, limit } = options;
      const result = yield* execGitCommand(
        ["log", "-n", String(limit), "--skip", String(offset), "--graph", "--pretty=format:%h %p"],
        cwd,
      );

      const lines = result
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");

      const commits: Array<{ current: string; parent: string }> = [];

      for (const line of lines) {
        const match = /^\* (?<current>.+) (?<parent>.+)$/.exec(line);
        if (
          match?.groups?.current !== undefined &&
          match.groups.current !== "" &&
          match.groups.parent !== undefined &&
          match.groups.parent !== ""
        ) {
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
          const branchNames = yield* getBranchNamesByCommitHash(cwd, commit.current);

          if (!branchNames.includes(targetBranch)) {
            continue;
          }

          const otherBranchNames = branchNames.filter((branchName) => branchName !== targetBranch);

          if (otherBranchNames.length === 0) {
            continue;
          }

          for (const branchName of otherBranchNames) {
            const comparison = yield* compareCommitHash(cwd, targetBranch, branchName);

            if (comparison === "behind") {
              return { branch: branchName, hash: commit.current };
            }
          }
        }

        offset += limit;
      }

      return null;
    });

  const getCommitsBetweenBranches = (cwd: string, baseBranch: string, targetBranch: string) =>
    Effect.gen(function* () {
      yield* validateGitRef(baseBranch);
      yield* validateGitRef(targetBranch);
      const result = yield* execGitCommand(
        ["log", `${baseBranch}..${targetBranch}`, "--format=%H|%s|%an|%ad", "--date=iso"],
        cwd,
      );

      return parseGitCommitsOutput(result);
    });

  const checkout = (cwd: string, branchName: string) =>
    Effect.gen(function* () {
      yield* validateGitRef(branchName);
      yield* execGitCommand(["checkout", branchName], cwd);
      return { success: true, branch: branchName };
    });

  return {
    getBranches,
    getCurrentBranch,
    branchExists,
    getCommits,
    getDiff,
    stageFiles,
    commit,
    push,
    getBranchHash,
    getBranchNamesByCommitHash,
    compareCommitHash,
    getCommitsWithParent,
    findBaseBranch,
    getCommitsBetweenBranches,
    checkout,
  };
});

export type IGitService = InferEffect<typeof LayerImpl>;

export class GitService extends Context.Tag("GitService")<GitService, IGitService>() {
  static Live = Layer.effect(this, LayerImpl);
}
