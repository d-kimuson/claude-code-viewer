import { basename, extname, resolve } from "node:path";
import { decodeProjectId } from "../../project/functions/id";

export const encodeSessionId = (jsonlFilePath: string) => {
  return basename(jsonlFilePath, extname(jsonlFilePath));
};

export const decodeSessionId = (projectId: string, sessionId: string) => {
  const projectPath = decodeProjectId(projectId);
  return resolve(projectPath, `${sessionId}.jsonl`);
};
