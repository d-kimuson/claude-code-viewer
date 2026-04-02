const toPosixPath = (filePath: string): string => filePath.replaceAll("\\", "/");

const getDirname = (filePath: string): string => {
  const normalized = toPosixPath(filePath);
  const lastSlashIndex = normalized.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return ".";
  }
  if (lastSlashIndex === 0) {
    return "/";
  }
  return normalized.slice(0, lastSlashIndex);
};

const normalizeAbsolutePath = (inputPath: string): string => {
  const normalizedInput = toPosixPath(inputPath);
  const isAbsolute = normalizedInput.startsWith("/");
  const rawSegments = normalizedInput.split("/");
  const resolvedSegments: string[] = [];

  for (const segment of rawSegments) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (resolvedSegments.length > 0) {
        resolvedSegments.pop();
      }
      continue;
    }
    resolvedSegments.push(segment);
  }

  const normalized = `${isAbsolute ? "/" : ""}${resolvedSegments.join("/")}`;
  if (normalized === "") {
    return isAbsolute ? "/" : ".";
  }
  return normalized;
};

export const encodeProjectId = (fullPath: string) => {
  return Buffer.from(fullPath).toString("base64url");
};

export const decodeProjectId = (id: string) => {
  return Buffer.from(id, "base64url").toString("utf-8");
};

export const encodeProjectIdFromSessionFilePath = (sessionFilePath: string) => {
  return encodeProjectId(getDirname(sessionFilePath));
};

/**
 * Validates that a decoded project path is within the Claude projects directory.
 * Prevents path traversal attacks via crafted projectId values.
 */
export const validateProjectPath = (
  decodedPath: string,
  claudeProjectsDirPath: string,
): boolean => {
  const normalizedPath = normalizeAbsolutePath(decodedPath);
  const normalizedBase = normalizeAbsolutePath(claudeProjectsDirPath);
  return normalizedPath.startsWith(`${normalizedBase}/`) || normalizedPath === normalizedBase;
};
