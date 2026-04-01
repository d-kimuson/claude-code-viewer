import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { GitError, GitResult } from "../types";

const execFileAsync = promisify(execFile);

/**
 * Execute a git command in the specified directory
 */
export const executeGitCommand = async (
  args: string[],
  cwd: string,
): Promise<GitResult<string>> => {
  try {
    // Check if the directory exists
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

    // Git will search parent directories for .git, so we don't need to check explicitly

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
    const err = error instanceof Object ? error : {};
    const errMessage =
      "message" in err && typeof err.message === "string" ? err.message : undefined;
    const errStderr = "stderr" in err && typeof err.stderr === "string" ? err.stderr : undefined;

    let errorCode: GitError["code"] = "COMMAND_FAILED";
    let errorMessage = errMessage ?? "Unknown git command error";

    if (errStderr !== undefined) {
      if (errStderr.includes("not a git repository")) {
        errorCode = "NOT_A_REPOSITORY";
        errorMessage = "Not a git repository";
      } else if (errStderr.includes("unknown revision")) {
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
        stderr: errStderr,
      },
    };
  }
};

/**
 * Check if a directory is a git repository
 */
export const isGitRepository = (cwd: string): boolean => {
  return existsSync(cwd) && existsSync(resolve(cwd, ".git"));
};

/**
 * Remove ANSI color codes from a string
 */
export const stripAnsiColors = (text: string): string => {
  // ANSI escape sequence pattern: \x1B[...m
  // biome-ignore lint/suspicious/noControlCharactersInRegex: this is a valid regex
  // oxlint-disable-next-line no-control-regex -- intentional ANSI escape sequence matching
  return text.replace(/\x1B\[[0-9;]*m/g, "");
};

/**
 * Safely parse git command output that might be empty
 */
export const parseLines = (output: string): string[] => {
  return output
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");
};

/**
 * Parse git status porcelain output
 */
export const parseStatusLine = (
  line: string,
): {
  status: string;
  filePath: string;
  oldPath?: string;
} => {
  const status = line.slice(0, 2);
  const filePath = line.slice(3);

  // Handle renamed files (R  old -> new)
  if (status.startsWith("R")) {
    const parts = filePath.split(" -> ");
    return {
      status,
      filePath: parts[1] ?? filePath,
      oldPath: parts[0],
    };
  }

  return { status, filePath };
};

/**
 * Convert git status code to readable status
 */
export const getFileStatus = (
  statusCode: string,
): "added" | "modified" | "deleted" | "renamed" | "copied" => {
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
    case undefined:
      return "modified";
    default:
      return "modified";
  }
};
