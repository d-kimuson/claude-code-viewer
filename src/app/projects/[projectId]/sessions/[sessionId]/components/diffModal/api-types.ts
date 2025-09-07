// API response types for Git operations
export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  commit: string;
  ahead?: number;
  behind?: number;
}

export interface GitBranchesResponse {
  success: true;
  data: GitBranch[];
}

export interface GitFileInfo {
  filePath: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied";
  additions: number;
  deletions: number;
  oldPath?: string;
}

export interface GitDiffLine {
  type: "added" | "deleted" | "unchanged" | "hunk";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
}

export interface GitFileDiff {
  file: GitFileInfo;
  hunks: GitDiffHunk[];
}

export interface GitDiffSummary {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}

export interface GitDiffResponse {
  success: true;
  data: {
    files: GitFileInfo[];
    diffs: GitFileDiff[];
    summary: GitDiffSummary;
  };
}

export interface GitErrorResponse {
  success: false;
  error: {
    code:
      | "NOT_A_REPOSITORY"
      | "BRANCH_NOT_FOUND"
      | "COMMAND_FAILED"
      | "PARSE_ERROR";
    message: string;
    command?: string;
    stderr?: string;
  };
}

export type GitApiResponse =
  | GitBranchesResponse
  | GitDiffResponse
  | GitErrorResponse;
