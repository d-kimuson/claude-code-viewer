import type { GitBranch } from "../types";
import { parseLines } from "./utils";

/**
 * Get all branches (local and remote) in the repository
 */
export const parseGitBranchesOutput = (output: string) => {
  const lines = parseLines(output);
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
};
