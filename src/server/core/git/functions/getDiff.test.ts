import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { compareBranches, getDiff } from "./getDiff";
import * as utils from "./utils";

vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof utils>();
  return {
    ...actual,
    executeGitCommand: vi.fn(),
  };
});

vi.mock("node:fs/promises");

describe("getDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("正常系", () => {
    it("2つのブランチ間のdiffを取得できる", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      const mockNumstatOutput = `5\t2\tsrc/file1.ts
10\t0\tsrc/file2.ts`;

      const mockDiffOutput = `diff --git a/src/file1.ts b/src/file1.ts
index abc123..def456 100644
--- a/src/file1.ts
+++ b/src/file1.ts
@@ -1,5 +1,8 @@
 function hello() {
-  console.log("old");
+  console.log("new");
+  console.log("added line 1");
+  console.log("added line 2");
 }
diff --git a/src/file2.ts b/src/file2.ts
new file mode 100644
index 0000000..ghi789
--- /dev/null
+++ b/src/file2.ts
@@ -0,0 +1,10 @@
+export const newFile = true;`;

      vi.mocked(utils.executeGitCommand)
        .mockResolvedValueOnce({
          success: true,
          data: mockNumstatOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockDiffOutput,
        });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.files).toHaveLength(2);
        expect(result.data.files[0]?.filePath).toBe("src/file1.ts");
        expect(result.data.files[0]?.status).toBe("modified");
        expect(result.data.files[0]?.additions).toBe(5);
        expect(result.data.files[0]?.deletions).toBe(2);

        expect(result.data.files[1]?.filePath).toBe("src/file2.ts");
        expect(result.data.files[1]?.status).toBe("added");
        expect(result.data.files[1]?.additions).toBe(10);
        expect(result.data.files[1]?.deletions).toBe(0);

        expect(result.data.summary.totalFiles).toBe(2);
        expect(result.data.summary.totalAdditions).toBe(15);
        expect(result.data.summary.totalDeletions).toBe(2);
      }

      expect(utils.executeGitCommand).toHaveBeenCalledWith(
        ["diff", "--numstat", "main", "feature"],
        mockCwd,
      );

      expect(utils.executeGitCommand).toHaveBeenCalledWith(
        ["diff", "--unified=5", "main", "feature"],
        mockCwd,
      );
    });

    it("HEADとworking directoryの比較ができる", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:HEAD";
      const toRef = "compare:working";

      const mockNumstatOutput = `3\t1\tsrc/modified.ts`;
      const mockDiffOutput = `diff --git a/src/modified.ts b/src/modified.ts
index abc123..def456 100644
--- a/src/modified.ts
+++ b/src/modified.ts
@@ -1,3 +1,5 @@
 const value = 1;`;

      const mockStatusOutput = `## main
M  src/modified.ts
?? src/untracked.ts`;

      vi.mocked(readFile).mockResolvedValue("line1\nline2\nline3");

      vi.mocked(utils.executeGitCommand)
        .mockResolvedValueOnce({
          success: true,
          data: mockNumstatOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockDiffOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockStatusOutput,
        });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        // modified file + untracked file
        expect(result.data.files.length).toBeGreaterThanOrEqual(1);
        const modifiedFile = result.data.files.find(
          (f) => f.filePath === "src/modified.ts",
        );
        expect(modifiedFile).toBeDefined();
        expect(modifiedFile?.status).toBe("modified");
      }
    });

    it("同一refの場合は空の結果を返す", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:main";
      const toRef = "compare:main";

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.files).toHaveLength(0);
        expect(result.data.diffs).toHaveLength(0);
        expect(result.data.summary.totalFiles).toBe(0);
        expect(result.data.summary.totalAdditions).toBe(0);
        expect(result.data.summary.totalDeletions).toBe(0);
      }

      expect(utils.executeGitCommand).not.toHaveBeenCalled();
    });

    it.skip("削除されたファイルを処理できる", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      const mockNumstatOutput = `0\t10\tsrc/deleted.ts`;
      const mockDiffOutput = `diff --git a/src/deleted.ts b/src/deleted.ts
deleted file mode 100644
index abc123..0000000 100644
--- a/src/deleted.ts
+++ /dev/null
@@ -1,10 +0,0 @@
-deleted line 1
-deleted line 2
-deleted line 3
-deleted line 4
-deleted line 5
-deleted line 6
-deleted line 7
-deleted line 8
-deleted line 9
-deleted line 10`;

      vi.mocked(utils.executeGitCommand)
        .mockResolvedValueOnce({
          success: true,
          data: mockNumstatOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockDiffOutput,
        });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.files).toHaveLength(1);
        expect(result.data.files[0]?.filePath).toBe("src/deleted.ts");
        expect(result.data.files[0]?.status).toBe("deleted");
        expect(result.data.files[0]?.additions).toBe(0);
        expect(result.data.files[0]?.deletions).toBe(10);
      }
    });

    it.skip("名前変更されたファイルを処理できる", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      const mockNumstatOutput = `0\t0\tnew-name.ts`;
      const mockDiffOutput = `diff --git a/old-name.ts b/new-name.ts
similarity index 100%
rename from old-name.ts
rename to new-name.ts
index abc123..abc123 100644`;

      vi.mocked(utils.executeGitCommand)
        .mockResolvedValueOnce({
          success: true,
          data: mockNumstatOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockDiffOutput,
        });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.files).toHaveLength(1);
        expect(result.data.files[0]?.status).toBe("renamed");
        expect(result.data.files[0]?.filePath).toBe("new-name.ts");
        expect(result.data.files[0]?.oldPath).toBe("old-name.ts");
      }
    });

    it("空のdiffを処理できる", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      const mockNumstatOutput = "";
      const mockDiffOutput = "";

      vi.mocked(utils.executeGitCommand)
        .mockResolvedValueOnce({
          success: true,
          data: mockNumstatOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockDiffOutput,
        });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.files).toHaveLength(0);
        expect(result.data.diffs).toHaveLength(0);
        expect(result.data.summary.totalFiles).toBe(0);
      }
    });
  });

  describe("エラー系", () => {
    it("ディレクトリが存在しない場合", async () => {
      const mockCwd = "/nonexistent/repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: false,
        error: {
          code: "NOT_A_REPOSITORY",
          message: `Directory does not exist: ${mockCwd}`,
          command: "git diff --numstat main feature",
        },
      });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_A_REPOSITORY");
        expect(result.error.message).toContain("Directory does not exist");
      }
    });

    it("Gitリポジトリでない場合", async () => {
      const mockCwd = "/test/not-a-repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: false,
        error: {
          code: "NOT_A_REPOSITORY",
          message: `Not a git repository: ${mockCwd}`,
          command: "git diff --numstat main feature",
        },
      });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_A_REPOSITORY");
        expect(result.error.message).toContain("Not a git repository");
      }
    });

    it("ブランチが見つからない場合", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:nonexistent";
      const toRef = "compare:feature";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: false,
        error: {
          code: "BRANCH_NOT_FOUND",
          message: "Branch or commit not found",
          command: "git diff --numstat nonexistent feature",
          stderr:
            "fatal: ambiguous argument 'nonexistent': unknown revision or path not in the working tree.",
        },
      });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("BRANCH_NOT_FOUND");
        expect(result.error.message).toBe("Branch or commit not found");
      }
    });

    it("numstatコマンドが失敗した場合", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: false,
        error: {
          code: "COMMAND_FAILED",
          message: "Command failed",
          command: "git diff --numstat main feature",
          stderr: "fatal: bad revision",
        },
      });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("COMMAND_FAILED");
      }
    });

    it("無効なfromRefの場合", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "invalidref";
      const toRef = "compare:feature";

      await expect(getDiff(mockCwd, fromRef, toRef)).rejects.toThrow(
        "Invalid ref text",
      );
    });
  });

  describe("エッジケース", () => {
    it("サブディレクトリから実行しても動作する", async () => {
      const mockCwd = "/test/repo/subdirectory";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      const mockNumstatOutput = `3\t1\tsrc/file.ts`;
      const mockDiffOutput = `diff --git a/src/file.ts b/src/file.ts
index abc123..def456 100644
--- a/src/file.ts
+++ b/src/file.ts
@@ -1,2 +1,3 @@
 content`;

      vi.mocked(utils.executeGitCommand)
        .mockResolvedValueOnce({
          success: true,
          data: mockNumstatOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockDiffOutput,
        });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.files).toHaveLength(1);
        expect(result.data.files[0]?.filePath).toBe("src/file.ts");
      }

      // Verify that git commands are executed in the subdirectory
      expect(utils.executeGitCommand).toHaveBeenCalledWith(
        ["diff", "--numstat", "main", "feature"],
        mockCwd,
      );
    });

    it("特殊文字を含むファイル名を処理できる", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      const mockNumstatOutput = `5\t2\tsrc/file with spaces.ts
3\t1\tsrc/日本語ファイル.ts`;

      const mockDiffOutput = `diff --git a/src/file with spaces.ts b/src/file with spaces.ts
index abc123..def456 100644
--- a/src/file with spaces.ts
+++ b/src/file with spaces.ts
@@ -1,3 +1,5 @@
 content
diff --git a/src/日本語ファイル.ts b/src/日本語ファイル.ts
index abc123..def456 100644
--- a/src/日本語ファイル.ts
+++ b/src/日本語ファイル.ts
@@ -1,2 +1,3 @@
 content`;

      vi.mocked(utils.executeGitCommand)
        .mockResolvedValueOnce({
          success: true,
          data: mockNumstatOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockDiffOutput,
        });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.files).toHaveLength(2);
        expect(result.data.files[0]?.filePath).toBe("src/file with spaces.ts");
        expect(result.data.files[1]?.filePath).toBe("src/日本語ファイル.ts");
      }
    });

    it("バイナリファイルの変更を処理できる", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      const mockNumstatOutput = `-\t-\timage.png`;
      const mockDiffOutput = `diff --git a/image.png b/image.png
index abc123..def456 100644
Binary files a/image.png and b/image.png differ`;

      vi.mocked(utils.executeGitCommand)
        .mockResolvedValueOnce({
          success: true,
          data: mockNumstatOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockDiffOutput,
        });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.files).toHaveLength(1);
        expect(result.data.files[0]?.filePath).toBe("image.png");
        expect(result.data.files[0]?.additions).toBe(0);
        expect(result.data.files[0]?.deletions).toBe(0);
      }
    });

    it("大量のファイル変更を処理できる", async () => {
      const mockCwd = "/test/repo";
      const fromRef = "base:main";
      const toRef = "compare:feature";

      const mockNumstatOutput = Array.from(
        { length: 100 },
        (_, i) => `1\t1\tfile${i}.ts`,
      ).join("\n");
      const mockDiffOutput = Array.from(
        { length: 100 },
        (_, i) => `diff --git a/file${i}.ts b/file${i}.ts
index abc123..def456 100644
--- a/file${i}.ts
+++ b/file${i}.ts
@@ -1 +1 @@
-old
+new`,
      ).join("\n");

      vi.mocked(utils.executeGitCommand)
        .mockResolvedValueOnce({
          success: true,
          data: mockNumstatOutput,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockDiffOutput,
        });

      const result = await getDiff(mockCwd, fromRef, toRef);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.files).toHaveLength(100);
        expect(result.data.summary.totalFiles).toBe(100);
        expect(result.data.summary.totalAdditions).toBe(100);
        expect(result.data.summary.totalDeletions).toBe(100);
      }
    });
  });
});

describe("compareBranches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDiffのショートハンドとして機能する", async () => {
    const mockCwd = "/test/repo";
    const baseBranch = "base:main";
    const targetBranch = "compare:feature";

    const mockNumstatOutput = `5\t2\tfile.ts`;
    const mockDiffOutput = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,5 @@
 content`;

    vi.mocked(utils.executeGitCommand)
      .mockResolvedValueOnce({
        success: true,
        data: mockNumstatOutput,
      })
      .mockResolvedValueOnce({
        success: true,
        data: mockDiffOutput,
      });

    const result = await compareBranches(mockCwd, baseBranch, targetBranch);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.files).toHaveLength(1);
      expect(result.data.files[0]?.filePath).toBe("file.ts");
    }
  });
});
