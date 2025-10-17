import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getDirectoryListing } from "./getDirectoryListing";

describe("getDirectoryListing", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `test-dir-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("should list directories and files", async () => {
    await mkdir(join(testDir, "subdir1"));
    await mkdir(join(testDir, "subdir2"));
    await writeFile(join(testDir, "file1.txt"), "content1");
    await writeFile(join(testDir, "file2.txt"), "content2");

    const result = await getDirectoryListing(testDir);

    expect(result.entries).toHaveLength(4);
    expect(result.entries).toEqual([
      { name: "subdir1", type: "directory", path: "subdir1" },
      { name: "subdir2", type: "directory", path: "subdir2" },
      { name: "file1.txt", type: "file", path: "file1.txt" },
      { name: "file2.txt", type: "file", path: "file2.txt" },
    ]);
    expect(result.basePath).toBe("/");
    expect(result.currentPath).toBe(testDir);
  });

  test("should navigate to subdirectory", async () => {
    await mkdir(join(testDir, "parent"));
    await mkdir(join(testDir, "parent", "child"));
    await writeFile(join(testDir, "parent", "file.txt"), "content");

    const result = await getDirectoryListing(testDir, "parent");

    expect(result.entries).toHaveLength(3);
    expect(result.entries).toEqual([
      { name: "..", type: "directory", path: "" },
      { name: "child", type: "directory", path: "parent/child" },
      { name: "file.txt", type: "file", path: "parent/file.txt" },
    ]);
    expect(result.basePath).toBe("parent");
  });

  test("should skip hidden files and directories", async () => {
    await mkdir(join(testDir, ".hidden-dir"));
    await writeFile(join(testDir, ".hidden-file"), "content");
    await mkdir(join(testDir, "visible-dir"));
    await writeFile(join(testDir, "visible-file.txt"), "content");

    const result = await getDirectoryListing(testDir);

    expect(result.entries).toHaveLength(2);
    expect(result.entries.some((e) => e.name.startsWith("."))).toBe(false);
  });

  test("should sort directories before files alphabetically", async () => {
    await mkdir(join(testDir, "z-dir"));
    await mkdir(join(testDir, "a-dir"));
    await writeFile(join(testDir, "z-file.txt"), "content");
    await writeFile(join(testDir, "a-file.txt"), "content");

    const result = await getDirectoryListing(testDir);

    expect(result.entries).toEqual([
      { name: "a-dir", type: "directory", path: "a-dir" },
      { name: "z-dir", type: "directory", path: "z-dir" },
      { name: "a-file.txt", type: "file", path: "a-file.txt" },
      { name: "z-file.txt", type: "file", path: "z-file.txt" },
    ]);
  });

  test("should return empty entries for non-existent directory", async () => {
    const result = await getDirectoryListing(join(testDir, "non-existent"));

    expect(result.entries).toEqual([]);
    expect(result.basePath).toBe("/");
  });

  test("should prevent directory traversal", async () => {
    await expect(getDirectoryListing(testDir, "../../../etc")).rejects.toThrow(
      "Invalid path: outside root directory",
    );
  });

  test("should handle basePath with leading slash", async () => {
    await mkdir(join(testDir, "subdir"));
    await writeFile(join(testDir, "subdir", "file.txt"), "content");

    const result = await getDirectoryListing(testDir, "/subdir");

    expect(result.entries).toHaveLength(2);
    expect(result.entries).toEqual([
      { name: "..", type: "directory", path: "" },
      { name: "file.txt", type: "file", path: "subdir/file.txt" },
    ]);
    expect(result.basePath).toBe("subdir");
  });

  test("should include parent directory entry when not at root", async () => {
    await mkdir(join(testDir, "parent"));
    await mkdir(join(testDir, "parent", "child"));

    const result = await getDirectoryListing(testDir, "parent");

    const parentEntry = result.entries.find((e) => e.name === "..");
    expect(parentEntry).toEqual({
      name: "..",
      type: "directory",
      path: "",
    });
  });

  test("should not include parent directory entry at root", async () => {
    await mkdir(join(testDir, "subdir"));

    const result = await getDirectoryListing(testDir);

    const parentEntry = result.entries.find((e) => e.name === "..");
    expect(parentEntry).toBeUndefined();
  });

  test("should use absolute paths in currentPath for navigation", async () => {
    await mkdir(join(testDir, "level1"));
    await mkdir(join(testDir, "level1", "level2"));

    const rootResult = await getDirectoryListing(testDir);
    expect(rootResult.currentPath).toBe(testDir);

    const level1Entry = rootResult.entries.find((e) => e.name === "level1");
    expect(level1Entry).toBeDefined();

    const level1Result = await getDirectoryListing(testDir, level1Entry?.path);
    expect(level1Result.currentPath).toBe(join(testDir, "level1"));

    const level2Entry = level1Result.entries.find((e) => e.name === "level2");
    expect(level2Entry).toBeDefined();

    const level2Result = await getDirectoryListing(testDir, level2Entry?.path);
    expect(level2Result.currentPath).toBe(join(testDir, "level1", "level2"));
  });
});
