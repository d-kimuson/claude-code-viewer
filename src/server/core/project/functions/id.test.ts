import { resolve } from "node:path";
import {
  decodeProjectId,
  encodeProjectId,
  encodeProjectIdFromSessionFilePath,
  validateProjectPath,
} from "./id";

const sampleProjectPath = "/path/to/claude-code-project-dir/projects/sample-project";
const sampleProjectId =
  "L3BhdGgvdG8vY2xhdWRlLWNvZGUtcHJvamVjdC1kaXIvcHJvamVjdHMvc2FtcGxlLXByb2plY3Q";

describe("encodeProjectId", () => {
  it("should encode project id from project path", () => {
    expect(encodeProjectId(sampleProjectPath)).toBe(sampleProjectId);
  });
});

describe("decodeProjectId", () => {
  it("should decode project absolute path from project id", () => {
    expect(decodeProjectId(sampleProjectId)).toBe(sampleProjectPath);
  });
});

describe("encodeProjectIdFromSessionFilePath", () => {
  it("should encode project id from session file path", () => {
    expect(
      encodeProjectIdFromSessionFilePath(resolve(sampleProjectPath, "sample-session-id.jsonl")),
    ).toBe(sampleProjectId);
  });
});

describe("validateProjectPath", () => {
  const claudeProjectsDir = "/home/user/.claude/projects";

  it("should accept a path within the projects directory", () => {
    expect(validateProjectPath("/home/user/.claude/projects/my-project", claudeProjectsDir)).toBe(
      true,
    );
  });

  it("should accept the projects directory itself", () => {
    expect(validateProjectPath(claudeProjectsDir, claudeProjectsDir)).toBe(true);
  });

  it("should reject a path outside the projects directory", () => {
    expect(validateProjectPath("/etc/passwd", claudeProjectsDir)).toBe(false);
  });

  it("should reject a path traversal attempt", () => {
    expect(
      validateProjectPath("/home/user/.claude/projects/../../../etc/passwd", claudeProjectsDir),
    ).toBe(false);
  });

  it("should reject a path that is a prefix but not a subdirectory", () => {
    expect(validateProjectPath("/home/user/.claude/projects-evil", claudeProjectsDir)).toBe(false);
  });
});
