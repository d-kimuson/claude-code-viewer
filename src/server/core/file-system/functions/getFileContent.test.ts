import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { DEFAULT_MAX_FILE_SIZE, getFileContent } from "./getFileContent";

describe("getFileContent", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `test-file-content-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("successful file reading", () => {
    test("should read text file content successfully", async () => {
      const content = "Hello, World!";
      await writeFile(join(testDir, "test.txt"), content);

      const result = await getFileContent(testDir, "test.txt");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).toBe(content);
        expect(result.filePath).toBe("test.txt");
        expect(result.truncated).toBe(false);
        expect(result.language).toBe("text");
      }
    });

    test("should detect language from file extension", async () => {
      const testCases: Array<{ ext: string; expectedLang: string }> = [
        { ext: "ts", expectedLang: "typescript" },
        { ext: "tsx", expectedLang: "tsx" },
        { ext: "js", expectedLang: "javascript" },
        { ext: "jsx", expectedLang: "jsx" },
        { ext: "json", expectedLang: "json" },
        { ext: "md", expectedLang: "markdown" },
        { ext: "py", expectedLang: "python" },
        { ext: "rs", expectedLang: "rust" },
        { ext: "go", expectedLang: "go" },
        { ext: "html", expectedLang: "html" },
        { ext: "css", expectedLang: "css" },
        { ext: "yml", expectedLang: "yaml" },
        { ext: "yaml", expectedLang: "yaml" },
        { ext: "sh", expectedLang: "bash" },
        { ext: "unknown", expectedLang: "text" },
      ];

      for (const { ext, expectedLang } of testCases) {
        await writeFile(join(testDir, `test.${ext}`), "content");
        const result = await getFileContent(testDir, `test.${ext}`);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.language).toBe(expectedLang);
        }
      }
    });

    test("should read file from nested directory", async () => {
      await mkdir(join(testDir, "nested", "deep"), { recursive: true });
      await writeFile(
        join(testDir, "nested", "deep", "file.txt"),
        "nested content",
      );

      const result = await getFileContent(testDir, "nested/deep/file.txt");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).toBe("nested content");
        expect(result.filePath).toBe("nested/deep/file.txt");
      }
    });
  });

  describe("path validation and security", () => {
    test("should reject path traversal with ..", async () => {
      await writeFile(join(testDir, "secret.txt"), "secret");

      const result = await getFileContent(testDir, "../secret.txt");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_PATH");
        expect(result.message).toContain("Path traversal");
      }
    });

    test("should reject path with multiple .. segments", async () => {
      const result = await getFileContent(testDir, "foo/../../bar/file.txt");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_PATH");
      }
    });

    test("should reject absolute path", async () => {
      const result = await getFileContent(testDir, "/etc/passwd");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_PATH");
        expect(result.message).toContain("Absolute path");
      }
    });

    test("should reject path outside project root after normalization", async () => {
      // Create a path that would escape the project root
      const result = await getFileContent(
        testDir,
        "subdir/../../../etc/passwd",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_PATH");
      }
    });

    test("should accept valid relative path with ./", async () => {
      await writeFile(join(testDir, "valid.txt"), "valid content");

      const result = await getFileContent(testDir, "./valid.txt");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).toBe("valid content");
      }
    });

    test("should reject empty file path", async () => {
      const result = await getFileContent(testDir, "");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_PATH");
      }
    });

    test("should reject path with null bytes", async () => {
      const result = await getFileContent(testDir, "file\x00.txt");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_PATH");
      }
    });
  });

  describe("file not found", () => {
    test("should return NOT_FOUND error for non-existent file", async () => {
      const result = await getFileContent(testDir, "nonexistent.txt");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("NOT_FOUND");
        expect(result.message).toContain("File not found");
      }
    });

    test("should return NOT_FOUND for directory path", async () => {
      await mkdir(join(testDir, "subdir"));

      const result = await getFileContent(testDir, "subdir");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("NOT_FOUND");
      }
    });
  });

  describe("file size limit", () => {
    test("should truncate file exceeding max size", async () => {
      // Create a file larger than the limit
      const maxSize = 1024; // 1KB for test
      const largeContent = "x".repeat(maxSize + 500);
      await writeFile(join(testDir, "large.txt"), largeContent);

      const result = await getFileContent(testDir, "large.txt", {
        maxFileSize: maxSize,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.truncated).toBe(true);
        expect(result.content.length).toBeLessThanOrEqual(maxSize);
      }
    });

    test("should not truncate file within size limit", async () => {
      const content = "small content";
      await writeFile(join(testDir, "small.txt"), content);

      const result = await getFileContent(testDir, "small.txt", {
        maxFileSize: 1024,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.truncated).toBe(false);
        expect(result.content).toBe(content);
      }
    });

    test("should use default max file size (1MB)", () => {
      expect(DEFAULT_MAX_FILE_SIZE).toBe(1024 * 1024);
    });
  });

  describe("binary file detection", () => {
    test("should detect binary file and return error", async () => {
      // Create a file with binary content (null bytes)
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
      await writeFile(join(testDir, "binary.bin"), binaryContent);

      const result = await getFileContent(testDir, "binary.bin");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("BINARY_FILE");
        expect(result.message).toContain("Binary file");
      }
    });

    test("should detect image files as binary by extension", async () => {
      const imageExtensions = [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "bmp",
        "ico",
        "webp",
      ];

      for (const ext of imageExtensions) {
        // Create file with image extension (content doesn't matter for extension check)
        await writeFile(join(testDir, `image.${ext}`), "fake content");

        const result = await getFileContent(testDir, `image.${ext}`);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("BINARY_FILE");
        }
      }
    });

    test("should detect other binary file types by extension", async () => {
      const binaryExtensions = [
        "exe",
        "dll",
        "so",
        "dylib",
        "pdf",
        "zip",
        "tar",
        "gz",
      ];

      for (const ext of binaryExtensions) {
        await writeFile(join(testDir, `file.${ext}`), "fake content");

        const result = await getFileContent(testDir, `file.${ext}`);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("BINARY_FILE");
        }
      }
    });

    test("should handle UTF-8 text content correctly", async () => {
      const utf8Content = "Hello 世界 🌍 こんにちは";
      await writeFile(join(testDir, "utf8.txt"), utf8Content, "utf-8");

      const result = await getFileContent(testDir, "utf8.txt");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).toBe(utf8Content);
      }
    });
  });

  describe("edge cases", () => {
    test("should handle empty file", async () => {
      await writeFile(join(testDir, "empty.txt"), "");

      const result = await getFileContent(testDir, "empty.txt");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).toBe("");
        expect(result.truncated).toBe(false);
      }
    });

    test("should handle file with special characters in name", async () => {
      const fileName = "file with spaces & special.txt";
      await writeFile(join(testDir, fileName), "content");

      const result = await getFileContent(testDir, fileName);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).toBe("content");
      }
    });

    test("should handle deeply nested path", async () => {
      const deepPath = "a/b/c/d/e/f/g";
      await mkdir(join(testDir, deepPath), { recursive: true });
      await writeFile(join(testDir, deepPath, "deep.txt"), "deep content");

      const result = await getFileContent(testDir, `${deepPath}/deep.txt`);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).toBe("deep content");
      }
    });
  });
});
