/* oxlint-disable no-restricted-imports */
/* Exception: this file currently exports synchronous helpers and has not been migrated to Effect Path yet. */
import { dirname, resolve } from "node:path";

export const encodeProjectId = (fullPath: string) => {
  return Buffer.from(fullPath).toString("base64url");
};

export const decodeProjectId = (id: string) => {
  return Buffer.from(id, "base64url").toString("utf-8");
};

export const encodeProjectIdFromSessionFilePath = (sessionFilePath: string) => {
  return encodeProjectId(dirname(sessionFilePath));
};

/**
 * Validates that a decoded project path is within the Claude projects directory.
 * Prevents path traversal attacks via crafted projectId values.
 */
export const validateProjectPath = (
  decodedPath: string,
  claudeProjectsDirPath: string,
): boolean => {
  const normalizedPath = resolve(decodedPath);
  const normalizedBase = resolve(claudeProjectsDirPath);
  return normalizedPath.startsWith(`${normalizedBase}/`) || normalizedPath === normalizedBase;
};
