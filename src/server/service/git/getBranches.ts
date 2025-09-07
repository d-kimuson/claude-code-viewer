import type { GitBranch, GitResult } from "./types";
import { executeGitCommand, parseLines } from "./utils";

/**
 * Get all branches (local and remote) in the repository
 */
export async function getBranches(
  cwd: string,
): Promise<GitResult<GitBranch[]>> {
  // Get all branches with verbose information
  const result = await executeGitCommand(["branch", "-vv", "--all"], cwd);

  if (!result.success) {
    return result as GitResult<GitBranch[]>;
  }

  try {
    const lines = parseLines(result.data);
    const branches: GitBranch[] = [];
    const seenBranches = new Set<string>();

    for (const line of lines) {
      // Parse branch line format: "  main     abc1234 [origin/main: ahead 1] Commit message"
      const match = line.match(
        /^(\*?\s*)([^\s]+)\s+([a-f0-9]+)(?:\s+\[([^\]]+)\])?\s*(.*)/,
      );
      if (!match) continue;

      const [, prefix, name, commit, tracking] = match;
      if (!prefix || !name || !commit) continue;

      const current = prefix.includes("*");

      // Skip remote tracking branches if we already have the local branch
      const cleanName = name.replace("remotes/origin/", "");
      if (name.startsWith("remotes/origin/") && seenBranches.has(cleanName)) {
        continue;
      }

      // Parse tracking information
      let remote: string | undefined;
      let ahead: number | undefined;
      let behind: number | undefined;

      if (tracking) {
        const remoteMatch = tracking.match(/^([^:]+)/);
        if (remoteMatch?.[1]) {
          remote = remoteMatch[1];
        }

        const aheadMatch = tracking.match(/ahead (\d+)/);
        const behindMatch = tracking.match(/behind (\d+)/);
        if (aheadMatch?.[1]) ahead = parseInt(aheadMatch[1], 10);
        if (behindMatch?.[1]) behind = parseInt(behindMatch[1], 10);
      }

      branches.push({
        name: cleanName,
        current,
        remote,
        commit,
        ahead,
        behind,
      });

      seenBranches.add(cleanName);
    }

    return {
      success: true,
      data: branches,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: `Failed to parse branch information: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    };
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(
  cwd: string,
): Promise<GitResult<string>> {
  const result = await executeGitCommand(["branch", "--show-current"], cwd);

  if (!result.success) {
    return result as GitResult<string>;
  }

  const currentBranch = result.data.trim();

  if (!currentBranch) {
    return {
      success: false,
      error: {
        code: "COMMAND_FAILED",
        message: "Could not determine current branch (possibly detached HEAD)",
      },
    };
  }

  return {
    success: true,
    data: currentBranch,
  };
}

/**
 * Check if a branch exists
 */
export async function branchExists(
  cwd: string,
  branchName: string,
): Promise<GitResult<boolean>> {
  const result = await executeGitCommand(
    ["rev-parse", "--verify", branchName],
    cwd,
  );

  return {
    success: true,
    data: result.success,
  };
}
