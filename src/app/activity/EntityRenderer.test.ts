import { describe, expect, it } from "vitest";
import {
  extractEntities,
  extractFileName,
  isFilePath,
  isGitCommit,
} from "./EntityRenderer";

describe("extractEntities", () => {
  it("should extract file paths", () => {
    const text = "Modified /src/app/main.ts and ./config.json";
    const entities = extractEntities(text);

    const filePaths = entities.filter((e) => e.type === "file-path");
    expect(filePaths.length).toBeGreaterThanOrEqual(1);
    expect(filePaths.some((e) => e.value.includes("main.ts"))).toBe(true);
  });

  it("should extract URLs", () => {
    const text = "Visit https://example.com/api for docs";
    const entities = extractEntities(text);

    const urls = entities.filter((e) => e.type === "url");
    expect(urls).toHaveLength(1);
    expect(urls[0]?.value).toBe("https://example.com/api");
  });

  it("should extract git commits with context", () => {
    const text = "commit a3f7d13 fixed the bug";
    const entities = extractEntities(text);

    const commits = entities.filter((e) => e.type === "git-commit");
    expect(commits).toHaveLength(1);
    expect(commits[0]?.value).toBe("a3f7d13");
  });

  it("should extract inline code", () => {
    const text = "Use `npm install` to add dependencies";
    const entities = extractEntities(text);

    const code = entities.filter((e) => e.type === "code");
    expect(code).toHaveLength(1);
    expect(code[0]?.value).toBe("npm install");
  });

  it("should handle multiple entities", () => {
    const text =
      "Modified /src/file.ts, commit abc1234, see https://example.com";
    const entities = extractEntities(text);

    expect(entities.length).toBeGreaterThanOrEqual(2);
  });

  it("should not overlap entities", () => {
    const text = "Check https://github.com/user/repo/commit/abc1234";
    const entities = extractEntities(text);

    // Should not have overlapping entities
    for (let i = 1; i < entities.length; i++) {
      const prev = entities[i - 1];
      const current = entities[i];
      if (prev && current) {
        expect(current.start).toBeGreaterThanOrEqual(prev.end);
      }
    }
  });

  it("should handle empty text", () => {
    const entities = extractEntities("");
    expect(entities).toHaveLength(0);
  });

  it("should handle text with no entities", () => {
    const entities = extractEntities("Hello, world!");
    expect(entities).toHaveLength(0);
  });
});

describe("extractFileName", () => {
  it("should extract file name from path", () => {
    expect(extractFileName("/src/app/main.ts")).toBe("main.ts");
    expect(extractFileName("./config.json")).toBe("config.json");
    expect(extractFileName("file.txt")).toBe("file.txt");
  });

  it("should handle paths with no file", () => {
    expect(extractFileName("/src/app/")).toBe("");
    expect(extractFileName("/")).toBe("");
  });
});

describe("isFilePath", () => {
  it("should recognize file paths", () => {
    expect(isFilePath("/src/main.ts")).toBe(true);
    expect(isFilePath("./config.json")).toBe(true);
    expect(isFilePath("src/app/file.ts")).toBe(true);
  });

  it("should reject non-paths", () => {
    expect(isFilePath("hello")).toBe(false);
    expect(isFilePath("123")).toBe(false);
  });
});

describe("isGitCommit", () => {
  it("should recognize git commit hashes", () => {
    expect(isGitCommit("a3f7d13")).toBe(true);
    expect(isGitCommit("abc1234567890def1234567890abc1234567890ab")).toBe(true);
  });

  it("should reject non-hashes", () => {
    expect(isGitCommit("hello")).toBe(false);
    expect(isGitCommit("123")).toBe(false);
    expect(isGitCommit("ghijkl")).toBe(false);
  });
});
