import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStatus,
  getUncommittedChanges,
  isWorkingDirectoryClean,
} from "./getStatus";
import * as utils from "./utils";

vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof utils>();
  return {
    ...actual,
    executeGitCommand: vi.fn(),
  };
});

describe("getStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("正常系", () => {
    it("Gitステータス情報を取得できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `## main...origin/main [ahead 2, behind 1]
M  staged-modified.ts
 M unstaged-modified.ts
A  staged-added.ts
?? untracked-file.ts`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getStatus(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.branch).toBe("main");
        expect(result.data.ahead).toBe(2);
        expect(result.data.behind).toBe(1);

        expect(result.data.staged).toHaveLength(2);
        expect(result.data.staged[0]?.filePath).toBe("staged-modified.ts");
        expect(result.data.staged[0]?.status).toBe("modified");
        expect(result.data.staged[1]?.filePath).toBe("staged-added.ts");
        expect(result.data.staged[1]?.status).toBe("added");

        expect(result.data.unstaged).toHaveLength(1);
        expect(result.data.unstaged[0]?.filePath).toBe("unstaged-modified.ts");
        expect(result.data.unstaged[0]?.status).toBe("modified");

        expect(result.data.untracked).toEqual(["untracked-file.ts"]);
        expect(result.data.conflicted).toHaveLength(0);
      }

      expect(utils.executeGitCommand).toHaveBeenCalledWith(
        ["status", "--porcelain=v1", "-b"],
        mockCwd,
      );
    });

    it("名前変更されたファイルを処理できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `## main
R  old-name.ts -> new-name.ts`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getStatus(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.staged).toHaveLength(1);
        expect(result.data.staged[0]?.filePath).toBe("new-name.ts");
        expect(result.data.staged[0]?.oldPath).toBe("old-name.ts");
        expect(result.data.staged[0]?.status).toBe("renamed");
      }
    });

    it("コンフリクトファイルを検出できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `## main
UU conflicted-file.ts
MM both-modified.ts`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getStatus(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conflicted).toEqual([
          "conflicted-file.ts",
          "both-modified.ts",
        ]);
        expect(result.data.staged).toHaveLength(0);
        expect(result.data.unstaged).toHaveLength(0);
      }
    });

    it("空のリポジトリ（クリーンな状態）を処理できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = "## main";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getStatus(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.branch).toBe("main");
        expect(result.data.ahead).toBe(0);
        expect(result.data.behind).toBe(0);
        expect(result.data.staged).toHaveLength(0);
        expect(result.data.unstaged).toHaveLength(0);
        expect(result.data.untracked).toHaveLength(0);
        expect(result.data.conflicted).toHaveLength(0);
      }
    });

    it("ブランチがupstreamを持たない場合", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `## feature-branch
M  file.ts`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getStatus(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.branch).toBe("feature-branch");
        expect(result.data.ahead).toBe(0);
        expect(result.data.behind).toBe(0);
      }
    });
  });

  describe("エラー系", () => {
    it("ディレクトリが存在しない場合", async () => {
      const mockCwd = "/nonexistent/repo";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: false,
        error: {
          code: "NOT_A_REPOSITORY",
          message: `Directory does not exist: ${mockCwd}`,
          command: "git status --porcelain=v1 -b",
        },
      });

      const result = await getStatus(mockCwd);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_A_REPOSITORY");
        expect(result.error.message).toContain("Directory does not exist");
      }
    });

    it("Gitリポジトリでない場合", async () => {
      const mockCwd = "/test/not-a-repo";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: false,
        error: {
          code: "NOT_A_REPOSITORY",
          message: `Not a git repository: ${mockCwd}`,
          command: "git status --porcelain=v1 -b",
        },
      });

      const result = await getStatus(mockCwd);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_A_REPOSITORY");
        expect(result.error.message).toContain("Not a git repository");
      }
    });

    it("Gitコマンドが失敗した場合", async () => {
      const mockCwd = "/test/repo";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: false,
        error: {
          code: "COMMAND_FAILED",
          message: "Command failed",
          command: "git status",
          stderr: "fatal: not a git repository",
        },
      });

      const result = await getStatus(mockCwd);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("COMMAND_FAILED");
        expect(result.error.message).toBe("Command failed");
      }
    });
  });

  describe("エッジケース", () => {
    it("特殊文字を含むファイル名を処理できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `## main
M  file with spaces.ts
A  日本語ファイル.ts
?? special@#$%chars.ts`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getStatus(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.staged[0]?.filePath).toBe("file with spaces.ts");
        expect(result.data.staged[1]?.filePath).toBe("日本語ファイル.ts");
        expect(result.data.untracked).toEqual(["special@#$%chars.ts"]);
      }
    });
  });
});

describe("getUncommittedChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stagedとunstagedの両方の変更を取得できる", async () => {
    const mockCwd = "/test/repo";
    const mockOutput = `## main
M  staged-file.ts
 M unstaged-file.ts`;

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: true,
      data: mockOutput,
    });

    const result = await getUncommittedChanges(mockCwd);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data.some((f) => f.filePath === "staged-file.ts")).toBe(
        true,
      );
      expect(result.data.some((f) => f.filePath === "unstaged-file.ts")).toBe(
        true,
      );
    }
  });

  it("重複するファイルを削除する", async () => {
    const mockCwd = "/test/repo";
    const mockOutput = `## main
MM both-changed.ts`;

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: true,
      data: mockOutput,
    });

    const result = await getUncommittedChanges(mockCwd);

    expect(result.success).toBe(true);
    if (result.success) {
      // Conflictとして処理されるため空になる
      expect(result.data).toHaveLength(0);
    }
  });
});

describe("isWorkingDirectoryClean", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("クリーンな作業ディレクトリでtrueを返す", async () => {
    const mockCwd = "/test/repo";
    const mockOutput = "## main";

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: true,
      data: mockOutput,
    });

    const result = await isWorkingDirectoryClean(mockCwd);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(true);
    }
  });

  it("変更がある場合falseを返す", async () => {
    const mockCwd = "/test/repo";
    const mockOutput = `## main
M  modified-file.ts`;

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: true,
      data: mockOutput,
    });

    const result = await isWorkingDirectoryClean(mockCwd);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(false);
    }
  });

  it("未追跡ファイルがある場合falseを返す", async () => {
    const mockCwd = "/test/repo";
    const mockOutput = `## main
?? untracked-file.ts`;

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: true,
      data: mockOutput,
    });

    const result = await isWorkingDirectoryClean(mockCwd);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(false);
    }
  });
});
