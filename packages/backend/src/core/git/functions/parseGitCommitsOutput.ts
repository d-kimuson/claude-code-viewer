import { parseLines } from "../functions/utils";
import type { GitCommit } from "../types";

/**
 * Get the last 20 commits from the current branch
 */
export const parseGitCommitsOutput = (output: string) => {
  const lines = parseLines(output);
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
};
