import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import parseGitDiff, {
  type AnyChunk,
  type AnyFileChange,
} from "parse-git-diff";
import type {
  GitComparisonResult,
  GitDiff,
  GitDiffFile,
  GitDiffHunk,
  GitDiffLine,
  GitResult,
} from "./types";
import { executeGitCommand, parseLines, stripAnsiColors } from "./utils";

/**
 * Convert parse-git-diff file change to GitDiffFile
 */
function convertToGitDiffFile(
  fileChange: AnyFileChange,
  fileStats: Map<string, { additions: number; deletions: number }>,
): GitDiffFile {
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
      // Fallback for any unknown types
      filePath = "";
      status = "modified";
  }

  // Get stats from numstat
  const stats = fileStats.get(filePath) ||
    fileStats.get(oldPath || "") || { additions: 0, deletions: 0 };

  return {
    filePath,
    status,
    additions: stats.additions,
    deletions: stats.deletions,
    oldPath,
  };
}

/**
 * Convert parse-git-diff chunk to GitDiffHunk
 */
function convertToGitDiffHunk(chunk: AnyChunk): GitDiffHunk {
  if (chunk.type !== "Chunk") {
    // For non-standard chunks, return empty hunk
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
        // This is likely a hunk header or context line
        line = {
          type: "context",
          content: change.content,
        };
        break;
      default:
        // Fallback for unknown line types
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
    header: `@@ -${chunk.fromFileRange.start},${chunk.fromFileRange.lines} +${chunk.toFileRange.start},${chunk.toFileRange.lines} @@${chunk.context ? ` ${chunk.context}` : ""}`,
    lines,
  };
}

const extractRef = (refText: string) => {
  const [group, ref] = refText.split(":");
  if (group === undefined || ref === undefined) {
    if (refText === "HEAD") {
      return "HEAD";
    }

    if (refText === "working") {
      return undefined;
    }

    throw new Error(`Invalid ref text: ${refText}`);
  }

  return ref;
};

/**
 * Get untracked files using git status
 */
async function getUntrackedFiles(cwd: string): Promise<GitResult<string[]>> {
  const statusResult = await executeGitCommand(
    ["status", "--untracked-files=all", "--short"],
    cwd,
  );

  console.log("debug statusResult stdout", statusResult);

  if (!statusResult.success) {
    return statusResult;
  }

  try {
    const untrackedFiles = parseLines(statusResult.data)
      .map((line) => stripAnsiColors(line)) // Remove ANSI color codes first
      .filter((line) => line.startsWith("??"))
      .map((line) => line.slice(3));

    return {
      success: true,
      data: untrackedFiles,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: `Failed to parse status output: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    };
  }
}

/**
 * Create artificial diff for an untracked file (all lines as additions)
 */
async function createUntrackedFileDiff(
  cwd: string,
  filePath: string,
): Promise<GitDiff | null> {
  try {
    const fullPath = resolve(cwd, filePath);
    const content = await readFile(fullPath, "utf8");
    const lines = content.split("\n");

    const diffLines: GitDiffLine[] = lines.map((line, index) => ({
      type: "added" as const,
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
  } catch (error) {
    // Skip files that can't be read (e.g., binary files, permission errors)
    console.warn(`Failed to read untracked file ${filePath}:`, error);
    return null;
  }
}

/**
 * Get Git diff between two references (branches, commits, tags)
 */
export const getDiff = async (
  cwd: string,
  fromRefText: string,
  toRefText: string,
): Promise<GitResult<GitComparisonResult>> => {
  const fromRef = extractRef(fromRefText);
  const toRef = extractRef(toRefText);

  if (fromRef === toRef) {
    return {
      success: true,
      data: {
        diffs: [],
        files: [],
        summary: {
          totalFiles: 0,
          totalAdditions: 0,
          totalDeletions: 0,
        },
      },
    };
  }

  if (fromRef === undefined) {
    throw new Error(`Invalid fromRef: ${fromRefText}`);
  }

  const commandArgs = toRef === undefined ? [fromRef] : [fromRef, toRef];

  // Get diff with numstat for file statistics
  const numstatResult = await executeGitCommand(
    ["diff", "--numstat", ...commandArgs],
    cwd,
  );

  if (!numstatResult.success) {
    return numstatResult;
  }

  // Get diff with full content
  const diffResult = await executeGitCommand(
    ["diff", "--unified=5", ...commandArgs],
    cwd,
  );

  if (!diffResult.success) {
    return diffResult;
  }

  try {
    // Parse numstat output to get file statistics
    const fileStats = new Map<
      string,
      { additions: number; deletions: number }
    >();
    const numstatLines = parseLines(numstatResult.data);

    for (const line of numstatLines) {
      const parts = line.split("\t");
      if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
        const additions = parts[0] === "-" ? 0 : parseInt(parts[0], 10);
        const deletions = parts[1] === "-" ? 0 : parseInt(parts[1], 10);
        const filePath = parts[2];
        fileStats.set(filePath, { additions, deletions });
      }
    }

    // Parse diff output using parse-git-diff
    const parsedDiff = parseGitDiff(diffResult.data);

    const files: GitDiffFile[] = [];
    const diffs: GitDiff[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const fileChange of parsedDiff.files) {
      // Convert to GitDiffFile format
      const file = convertToGitDiffFile(fileChange, fileStats);
      files.push(file);

      // Convert chunks to hunks
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

    // Include untracked files when comparing to working directory
    if (toRef === undefined) {
      const untrackedResult = await getUntrackedFiles(cwd);
      console.log("debug untrackedResult", untrackedResult);
      if (untrackedResult.success) {
        for (const untrackedFile of untrackedResult.data) {
          const untrackedDiff = await createUntrackedFileDiff(
            cwd,
            untrackedFile,
          );
          if (untrackedDiff) {
            files.push(untrackedDiff.file);
            diffs.push(untrackedDiff);
            totalAdditions += untrackedDiff.file.additions;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        files,
        diffs,
        summary: {
          totalFiles: files.length,
          totalAdditions,
          totalDeletions,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: `Failed to parse diff: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    };
  }
};

/**
 * Compare between two branches (shorthand for getDiff)
 */
export async function compareBranches(
  cwd: string,
  baseBranch: string,
  targetBranch: string,
): Promise<GitResult<GitComparisonResult>> {
  return getDiff(cwd, baseBranch, targetBranch);
}
