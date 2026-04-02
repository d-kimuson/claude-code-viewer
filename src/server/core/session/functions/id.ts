import { decodeProjectId } from "../../project/functions/id.ts";

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const toPosixPath = (filePath: string): string => filePath.replaceAll("\\", "/");

const getBasename = (filePath: string): string => {
  const normalized = toPosixPath(filePath);
  const lastSlashIndex = normalized.lastIndexOf("/");
  return lastSlashIndex === -1 ? normalized : normalized.slice(lastSlashIndex + 1);
};

const stripExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    return fileName;
  }
  return fileName.slice(0, lastDotIndex);
};

const joinPath = (basePath: string, childPath: string): string => {
  const normalizedBase = toPosixPath(basePath).replace(/\/+$/u, "");
  if (normalizedBase === "") {
    return `/${childPath}`;
  }
  return `${normalizedBase}/${childPath}`;
};

export const encodeSessionId = (jsonlFilePath: string) => {
  return stripExtension(getBasename(jsonlFilePath));
};

/**
 * Validates that a sessionId contains only safe characters (alphanumeric, hyphens, underscores).
 * Prevents path traversal attacks via crafted sessionId values.
 */
export const validateSessionId = (sessionId: string): boolean => {
  return SESSION_ID_PATTERN.test(sessionId);
};

export const decodeSessionId = (projectId: string, sessionId: string) => {
  const projectPath = decodeProjectId(projectId);
  return joinPath(projectPath, `${sessionId}.jsonl`);
};
