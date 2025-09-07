export type GitBranch = {
  name: string;
  current: boolean;
  remote?: string;
  commit: string;
  ahead?: number;
  behind?: number;
};

export type GitCommit = {
  sha: string;
  message: string;
  author: string;
  date: string;
};

export type GitDiffFile = {
  filePath: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied";
  additions: number;
  deletions: number;
  oldPath?: string; // For renamed files
};

export type GitDiffHunk = {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  header: string;
  lines: GitDiffLine[];
};

export type GitDiffLine = {
  type: "context" | "added" | "deleted";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
};

export type GitDiff = {
  file: GitDiffFile;
  hunks: GitDiffHunk[];
};

export type GitComparisonResult = {
  files: GitDiffFile[];
  diffs: GitDiff[];
  summary: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  };
};

export type GitStatus = {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitDiffFile[];
  unstaged: GitDiffFile[];
  untracked: string[];
  conflicted: string[];
};

export type GitError = {
  code:
    | "NOT_A_REPOSITORY"
    | "BRANCH_NOT_FOUND"
    | "COMMAND_FAILED"
    | "PARSE_ERROR";
  message: string;
  command?: string;
  stderr?: string;
};

export type GitResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: GitError;
    };
