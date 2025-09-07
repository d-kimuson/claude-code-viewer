import type { GitDiffFile, GitResult, GitStatus } from "./types";
import {
  executeGitCommand,
  getFileStatus,
  parseLines,
  parseStatusLine,
} from "./utils";

/**
 * Get git status information including staged, unstaged, and untracked files
 */
export async function getStatus(cwd: string): Promise<GitResult<GitStatus>> {
  // Get porcelain status for consistent parsing
  const statusResult = await executeGitCommand(
    ["status", "--porcelain=v1", "-b"],
    cwd,
  );

  if (!statusResult.success) {
    return statusResult as GitResult<GitStatus>;
  }

  try {
    const lines = parseLines(statusResult.data);
    const staged: GitDiffFile[] = [];
    const unstaged: GitDiffFile[] = [];
    const untracked: string[] = [];
    const conflicted: string[] = [];

    let branch = "HEAD";
    let ahead = 0;
    let behind = 0;

    for (const line of lines) {
      // Parse branch line
      if (line.startsWith("##")) {
        const branchMatch = line.match(/^##\s+(.+?)(?:\.\.\.|$)/);
        if (branchMatch?.[1]) {
          branch = branchMatch[1];
        }

        const aheadMatch = line.match(/ahead (\d+)/);
        const behindMatch = line.match(/behind (\d+)/);
        if (aheadMatch?.[1]) ahead = parseInt(aheadMatch[1], 10);
        if (behindMatch?.[1]) behind = parseInt(behindMatch[1], 10);
        continue;
      }

      // Parse file status lines
      const { status, filePath, oldPath } = parseStatusLine(line);
      const indexStatus = status[0]; // Staged changes
      const workTreeStatus = status[1]; // Unstaged changes

      // Handle conflicts (both index and work tree have changes)
      if (
        indexStatus === "U" ||
        workTreeStatus === "U" ||
        (indexStatus !== " " &&
          indexStatus !== "?" &&
          workTreeStatus !== " " &&
          workTreeStatus !== "?")
      ) {
        conflicted.push(filePath);
        continue;
      }

      // Handle staged changes (index status)
      if (indexStatus !== " " && indexStatus !== "?") {
        staged.push({
          filePath,
          status: getFileStatus(`${indexStatus} `),
          additions: 0, // We don't have line counts from porcelain status
          deletions: 0,
          oldPath,
        });
      }

      // Handle unstaged changes (work tree status)
      if (workTreeStatus !== " " && workTreeStatus !== "?") {
        if (workTreeStatus === "?") {
          untracked.push(filePath);
        } else {
          unstaged.push({
            filePath,
            status: getFileStatus(` ${workTreeStatus}`),
            additions: 0,
            deletions: 0,
            oldPath,
          });
        }
      }

      // Handle untracked files
      if (status === "??") {
        untracked.push(filePath);
      }
    }

    return {
      success: true,
      data: {
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        conflicted,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: `Failed to parse git status: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    };
  }
}

/**
 * Get uncommitted changes (both staged and unstaged)
 */
export async function getUncommittedChanges(
  cwd: string,
): Promise<GitResult<GitDiffFile[]>> {
  const statusResult = await getStatus(cwd);

  if (!statusResult.success) {
    return statusResult as GitResult<GitDiffFile[]>;
  }

  const { staged, unstaged } = statusResult.data;
  const allChanges = [...staged, ...unstaged];

  // Remove duplicates (files that are both staged and unstaged)
  const uniqueChanges = allChanges.reduce((acc: GitDiffFile[], change) => {
    const existing = acc.find((c) => c.filePath === change.filePath);
    if (!existing) {
      acc.push(change);
    }
    return acc;
  }, [] as GitDiffFile[]);

  return {
    success: true,
    data: uniqueChanges,
  };
}

/**
 * Check if the working directory is clean (no uncommitted changes)
 */
export async function isWorkingDirectoryClean(
  cwd: string,
): Promise<GitResult<boolean>> {
  const statusResult = await getStatus(cwd);

  if (!statusResult.success) {
    return statusResult as GitResult<boolean>;
  }

  const { staged, unstaged, untracked } = statusResult.data;
  const isClean =
    staged.length === 0 && unstaged.length === 0 && untracked.length === 0;

  return {
    success: true,
    data: isClean,
  };
}
