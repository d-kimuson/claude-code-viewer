import { readFile, stat } from "node:fs/promises";
import { extname, normalize, resolve } from "node:path";

/** Default maximum file size in bytes (1MB) */
export const DEFAULT_MAX_FILE_SIZE = 1024 * 1024;

/** Binary file extensions that should be rejected */
const BINARY_EXTENSIONS = new Set([
  // Images
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "ico",
  "webp",
  "svg",
  "tiff",
  "tif",
  // Archives
  "zip",
  "tar",
  "gz",
  "bz2",
  "7z",
  "rar",
  "xz",
  // Executables
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  // Documents
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  // Media
  "mp3",
  "mp4",
  "avi",
  "mov",
  "mkv",
  "wav",
  "flac",
  // Database
  "db",
  "sqlite",
  "sqlite3",
  // Other
  "wasm",
  "ttf",
  "otf",
  "woff",
  "woff2",
  "eot",
]);

/** Language detection mapping from file extension */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  rs: "rust",
  go: "go",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  xml: "xml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "fish",
  ps1: "powershell",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  rb: "ruby",
  php: "php",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  swift: "swift",
  m: "objectivec",
  mm: "objectivec",
  r: "r",
  lua: "lua",
  vim: "vim",
  dockerfile: "dockerfile",
  makefile: "makefile",
  cmake: "cmake",
  tf: "hcl",
  hcl: "hcl",
  proto: "protobuf",
  prisma: "prisma",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  zig: "zig",
  elm: "elm",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hrl: "erlang",
  clj: "clojure",
  cljs: "clojure",
  cljc: "clojure",
  hs: "haskell",
  lhs: "haskell",
  ml: "ocaml",
  mli: "ocaml",
  fs: "fsharp",
  fsx: "fsharp",
  fsi: "fsharp",
  pl: "perl",
  pm: "perl",
  nim: "nim",
  d: "d",
  dart: "dart",
  v: "v",
  sol: "solidity",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  env: "shell",
  gitignore: "gitignore",
  editorconfig: "editorconfig",
  txt: "text",
};

export type FileContentSuccess = {
  success: true;
  content: string;
  filePath: string;
  truncated: boolean;
  language: string;
};

export type FileContentError = {
  success: false;
  error: "INVALID_PATH" | "NOT_FOUND" | "BINARY_FILE" | "READ_ERROR";
  message: string;
  filePath: string;
};

export type FileContentResult = FileContentSuccess | FileContentError;

export type GetFileContentOptions = {
  maxFileSize?: number;
};

/**
 * Detects the programming language from a file path
 */
export const detectLanguage = (filePath: string): string => {
  const ext = extname(filePath).toLowerCase().slice(1);

  // Handle special filenames without extension
  const basename = filePath.split("/").pop() ?? "";
  const lowerBasename = basename.toLowerCase();

  if (lowerBasename === "dockerfile") return "dockerfile";
  if (lowerBasename === "makefile") return "makefile";
  if (lowerBasename.startsWith(".env")) return "shell";

  return EXTENSION_TO_LANGUAGE[ext] ?? "text";
};

/**
 * Checks if a file extension indicates a binary file
 */
export const isBinaryExtension = (filePath: string): boolean => {
  const ext = extname(filePath).toLowerCase().slice(1);
  return BINARY_EXTENSIONS.has(ext);
};

/**
 * Checks if file content appears to be binary
 * Detects null bytes which are common in binary files
 */
export const isBinaryContent = (buffer: Buffer): boolean => {
  // Check first 8KB for null bytes
  const checkLength = Math.min(buffer.length, 8192);
  for (let i = 0; i < checkLength; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
};

/**
 * Validates that the file path is safe and within the project root
 * Accepts both absolute paths (must be within project root) and relative paths
 */
export const validateFilePath = (
  projectRoot: string,
  filePath: string,
):
  | { valid: true; resolvedPath: string }
  | { valid: false; message: string } => {
  // Check for empty path
  if (!filePath || filePath.trim() === "") {
    return { valid: false, message: "File path cannot be empty" };
  }

  // Check for null bytes
  if (filePath.includes("\x00")) {
    return { valid: false, message: "File path contains invalid characters" };
  }

  // Check for path traversal attempts
  if (filePath.includes("..")) {
    return { valid: false, message: "Path traversal (..) is not allowed" };
  }

  const resolvedRoot = resolve(projectRoot);
  let resolvedPath: string;

  // Handle absolute paths
  if (filePath.startsWith("/")) {
    resolvedPath = normalize(filePath);
  } else {
    // Handle relative paths
    const normalizedPath = normalize(filePath);
    resolvedPath = resolve(projectRoot, normalizedPath);
  }

  // Ensure the resolved path is within the project root
  if (
    !resolvedPath.startsWith(`${resolvedRoot}/`) &&
    resolvedPath !== resolvedRoot
  ) {
    return { valid: false, message: "Path is outside the project root" };
  }

  return { valid: true, resolvedPath };
};

/**
 * Reads file content from a project directory with security validations
 *
 * @param projectRoot - The root directory of the project
 * @param filePath - Relative path to the file within the project
 * @param options - Optional configuration (maxFileSize)
 * @returns FileContentResult with either success data or error information
 */
export const getFileContent = async (
  projectRoot: string,
  filePath: string,
  options: GetFileContentOptions = {},
): Promise<FileContentResult> => {
  const { maxFileSize = DEFAULT_MAX_FILE_SIZE } = options;

  // Validate the file path
  const validation = validateFilePath(projectRoot, filePath);
  if (!validation.valid) {
    return {
      success: false,
      error: "INVALID_PATH",
      message: validation.message,
      filePath,
    };
  }

  const { resolvedPath } = validation;

  // Check if file is binary by extension first
  if (isBinaryExtension(filePath)) {
    return {
      success: false,
      error: "BINARY_FILE",
      message: "Binary file cannot be displayed",
      filePath,
    };
  }

  try {
    // Check if file exists and is a file (not directory)
    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) {
      return {
        success: false,
        error: "NOT_FOUND",
        message: "File not found or is a directory",
        filePath,
      };
    }

    // Read file content
    const buffer = await readFile(resolvedPath);

    // Check for binary content
    if (isBinaryContent(buffer)) {
      return {
        success: false,
        error: "BINARY_FILE",
        message: "Binary file cannot be displayed",
        filePath,
      };
    }

    // Convert to string and handle size limit
    let content = buffer.toString("utf-8");
    const truncated = buffer.length > maxFileSize;

    if (truncated) {
      // Truncate at a UTF-8 safe boundary
      const truncatedBuffer = buffer.subarray(0, maxFileSize);
      content = truncatedBuffer.toString("utf-8");
    }

    // Detect language
    const language = detectLanguage(filePath);

    return {
      success: true,
      content,
      filePath,
      truncated,
      language,
    };
  } catch (error) {
    // Handle file not found
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
    ) {
      return {
        success: false,
        error: "NOT_FOUND",
        message: "File not found",
        filePath,
      };
    }

    // Handle other errors
    return {
      success: false,
      error: "READ_ERROR",
      message: error instanceof Error ? error.message : "Failed to read file",
      filePath,
    };
  }
};
