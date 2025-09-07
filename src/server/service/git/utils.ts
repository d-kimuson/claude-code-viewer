import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import type { GitError, GitResult } from "./types";

const execFileAsync = promisify(execFile);

/**
 * Execute a git command in the specified directory
 */
export async function executeGitCommand(
  args: string[],
  cwd: string,
): Promise<GitResult<string>> {
  try {
    // Check if the directory exists and contains a git repository
    if (!existsSync(cwd)) {
      return {
        success: false,
        error: {
          code: "NOT_A_REPOSITORY",
          message: `Directory does not exist: ${cwd}`,
          command: `git ${args.join(" ")}`,
        },
      };
    }

    if (!existsSync(resolve(cwd, ".git"))) {
      return {
        success: false,
        error: {
          code: "NOT_A_REPOSITORY",
          message: `Not a git repository: ${cwd}`,
          command: `git ${args.join(" ")}`,
        },
      };
    }

    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
      timeout: 30000, // 30 second timeout
    });

    return {
      success: true,
      data: stdout,
    };
  } catch (error: unknown) {
    const err = error as { code?: string; stderr?: string; message?: string };

    let errorCode: GitError["code"] = "COMMAND_FAILED";
    let errorMessage = err.message || "Unknown git command error";

    if (err.stderr) {
      if (err.stderr.includes("not a git repository")) {
        errorCode = "NOT_A_REPOSITORY";
        errorMessage = "Not a git repository";
      } else if (err.stderr.includes("unknown revision")) {
        errorCode = "BRANCH_NOT_FOUND";
        errorMessage = "Branch or commit not found";
      }
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        command: `git ${args.join(" ")}`,
        stderr: err.stderr,
      },
    };
  }
}

/**
 * Check if a directory is a git repository
 */
export function isGitRepository(cwd: string): boolean {
  return existsSync(cwd) && existsSync(resolve(cwd, ".git"));
}

/**
 * Remove ANSI color codes from a string
 */
export function stripAnsiColors(text: string): string {
  // ANSI escape sequence pattern: \x1B[...m
  // biome-ignore lint/suspicious/noControlCharactersInRegex: this is a valid regex
  return text.replace(/\x1B\[[0-9;]*m/g, "");
}

/**
 * Safely parse git command output that might be empty
 */
export function parseLines(output: string): string[] {
  return output
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");
}

/**
 * Parse git status porcelain output
 */
export function parseStatusLine(line: string): {
  status: string;
  filePath: string;
  oldPath?: string;
} {
  const status = line.slice(0, 2);
  const filePath = line.slice(3);

  // Handle renamed files (R  old -> new)
  if (status.startsWith("R")) {
    const parts = filePath.split(" -> ");
    return {
      status,
      filePath: parts[1] || filePath,
      oldPath: parts[0],
    };
  }

  return { status, filePath };
}

/**
 * Convert git status code to readable status
 */
export function getFileStatus(
  statusCode: string,
): "added" | "modified" | "deleted" | "renamed" | "copied" {
  const firstChar = statusCode[0];

  switch (firstChar) {
    case "A":
      return "added";
    case "M":
      return "modified";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    default:
      return "modified";
  }
}
