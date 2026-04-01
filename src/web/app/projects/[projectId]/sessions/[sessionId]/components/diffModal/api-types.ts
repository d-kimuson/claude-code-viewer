// API response types for Git operations
export type GitBranch = {
  name: string;
  current: boolean;
  remote?: string;
  commit: string;
  ahead?: number;
  behind?: number;
};

export type GitBranchesResponse = {
  success: true;
  data: GitBranch[];
};

export type GitFileInfo = {
  filePath: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied";
  additions: number;
  deletions: number;
  oldPath?: string;
};

export type GitDiffLine = {
  type: "added" | "deleted" | "unchanged" | "hunk";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
};

export type GitDiffHunk = {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
};

export type GitFileDiff = {
  file: GitFileInfo;
  hunks: GitDiffHunk[];
};

export type GitDiffSummary = {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
};

export type GitDiffResponse = {
  success: true;
  data: {
    files: GitFileInfo[];
    diffs: GitFileDiff[];
    summary: GitDiffSummary;
  };
};

export type GitErrorResponse = {
  success: false;
  error: {
    code: "NOT_A_REPOSITORY" | "BRANCH_NOT_FOUND" | "COMMAND_FAILED" | "PARSE_ERROR";
    message: string;
    command?: string;
    stderr?: string;
  };
};

export type GitApiResponse = GitBranchesResponse | GitDiffResponse | GitErrorResponse;
