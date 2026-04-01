import { basename, extname, resolve } from "node:path";
import { decodeProjectId } from "../../project/functions/id";

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const encodeSessionId = (jsonlFilePath: string) => {
  return basename(jsonlFilePath, extname(jsonlFilePath));
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
  return resolve(projectPath, `${sessionId}.jsonl`);
};
