export type FileCompletionEntry = {
  name: string;
  type: "file" | "directory";
  path: string;
};

export type FileCompletionResult = {
  entries: FileCompletionEntry[];
  basePath: string;
  projectPath: string;
};

export type DirectoryEntry = {
  name: string;
  type: "file" | "directory";
  path: string;
};

export type DirectoryListingResult = {
  entries: DirectoryEntry[];
  basePath: string;
  currentPath: string;
};
