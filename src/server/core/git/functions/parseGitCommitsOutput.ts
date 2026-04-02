import type { GitCommit } from "../types.ts";
import { parseLines } from "./text.ts";

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

    const sha = parts[0];
    const date = parts.at(-1);
    const author = parts.at(-2);
    const messageParts = parts.slice(1, -2);
    const message = messageParts.join("|");
    if (sha === undefined || message === undefined || author === undefined || date === undefined)
      continue;
    if (sha.trim() === "" || message.trim() === "" || author.trim() === "" || date.trim() === "") {
      continue;
    }

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
