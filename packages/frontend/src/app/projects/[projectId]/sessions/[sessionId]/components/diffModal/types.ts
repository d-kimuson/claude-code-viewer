export interface DiffLine {
  type: "added" | "deleted" | "unchanged" | "hunk" | "context";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffHunk {
  oldStart: number;
  // oldLines: number;
  newStart: number;
  // newLines: number;
  lines: DiffLine[];
}

export interface FileDiff {
  filename: string;
  oldFilename?: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  isBinary: boolean;
  hunks: DiffHunk[];
  linesAdded: number;
  linesDeleted: number;
}

export interface GitRef {
  name: `branch:${string}` | `commit:${string}` | `HEAD` | "working";
  type: "branch" | "commit" | "head" | "working";
  sha?: string;
  displayName: string;
}

export interface DiffSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: FileDiff[];
}

export interface DiffModalProps {
  projectId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompareFrom?: string;
  defaultCompareTo?: string;
}
