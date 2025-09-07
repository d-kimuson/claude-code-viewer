import type { GitCommit, GitResult } from "./types";
import { executeGitCommand, parseLines } from "./utils";

/**
 * Get the last 20 commits from the current branch
 */
export async function getCommits(cwd: string): Promise<GitResult<GitCommit[]>> {
  // Get commits with oneline format and limit to 20
  const result = await executeGitCommand(
    ["log", "--oneline", "-n", "20", "--format=%H|%s|%an|%ad", "--date=iso"],
    cwd,
  );

  if (!result.success) {
    return result as GitResult<GitCommit[]>;
  }

  try {
    const lines = parseLines(result.data);
    const commits: GitCommit[] = [];

    for (const line of lines) {
      // Parse commit line format: "sha|message|author|date"
      const parts = line.split("|");
      if (parts.length < 4) continue;

      const [sha, message, author, date] = parts;
      if (!sha || !message || !author || !date) continue;

      commits.push({
        sha: sha.trim(),
        message: message.trim(),
        author: author.trim(),
        date: date.trim(),
      });
    }

    return {
      success: true,
      data: commits,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: `Failed to parse commit information: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    };
  }
}
