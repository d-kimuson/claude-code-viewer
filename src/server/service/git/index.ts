// Git service utilities for claude-code-viewer
// Provides comprehensive Git operations including branch management, diff generation, and status checking

export * from "./getBranches";
// Re-export main functions for convenience
export { branchExists, getBranches, getCurrentBranch } from "./getBranches";
export * from "./getCommits";
export { getCommits } from "./getCommits";
export * from "./getDiff";
export { compareBranches, getDiff } from "./getDiff";
export * from "./getStatus";
export {
  getStatus,
  getUncommittedChanges,
  isWorkingDirectoryClean,
} from "./getStatus";
// Types re-export for convenience
export type {
  GitBranch,
  GitCommit,
  GitComparisonResult,
  GitDiff,
  GitDiffFile,
  GitDiffHunk,
  GitDiffLine,
  GitError,
  GitResult,
  GitStatus,
} from "./types";
export * from "./types";
export * from "./utils";
export { executeGitCommand, isGitRepository } from "./utils";
