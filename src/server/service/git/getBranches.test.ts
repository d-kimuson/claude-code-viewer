import { beforeEach, describe, expect, it, vi } from "vitest";
import { branchExists, getBranches, getCurrentBranch } from "./getBranches";
import * as utils from "./utils";

vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof utils>();
  return {
    ...actual,
    executeGitCommand: vi.fn(),
  };
});

describe("getBranches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("正常系", () => {
    it("ブランチ一覧を取得できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `* main                abc1234 [origin/main: ahead 1] Latest commit
  remotes/origin/main abc1234 Latest commit
  feature             def5678 [origin/feature] Feature commit`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getBranches(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);

        expect(result.data[0]).toEqual({
          name: "main",
          current: true,
          remote: "origin/main",
          commit: "abc1234",
          ahead: 1,
          behind: undefined,
        });

        expect(result.data[1]).toEqual({
          name: "feature",
          current: false,
          remote: "origin/feature",
          commit: "def5678",
          ahead: undefined,
          behind: undefined,
        });
      }

      expect(utils.executeGitCommand).toHaveBeenCalledWith(
        ["branch", "-vv", "--all"],
        mockCwd,
      );
    });

    it("ahead/behindの両方を持つブランチを処理できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput =
        "* main     abc1234 [origin/main: ahead 2, behind 3] Commit message";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getBranches(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual({
          name: "main",
          current: true,
          remote: "origin/main",
          commit: "abc1234",
          ahead: 2,
          behind: 3,
        });
      }
    });

    it("リモートトラッキングブランチを除外する", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `* main                abc1234 [origin/main] Latest commit
  remotes/origin/main abc1234 Latest commit
  feature             def5678 Feature commit
  remotes/origin/feature def5678 Feature commit`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getBranches(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.name).toBe("main");
        expect(result.data[1]?.name).toBe("feature");
      }
    });

    it("空の結果を返す（ブランチがない場合）", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = "";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getBranches(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("不正な形式の行をスキップする", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `* main     abc1234 [origin/main] Latest commit
invalid line
  feature  def5678 Feature commit`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getBranches(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.name).toBe("main");
        expect(result.data[1]?.name).toBe("feature");
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
          command: "git branch -vv --all",
        },
      });

      const result = await getBranches(mockCwd);

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
          command: "git branch -vv --all",
        },
      });

      const result = await getBranches(mockCwd);

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
          command: "git branch",
          stderr: "fatal: not a git repository",
        },
      });

      const result = await getBranches(mockCwd);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("COMMAND_FAILED");
        expect(result.error.message).toBe("Command failed");
      }
    });
  });

  describe("エッジケース", () => {
    it("特殊文字を含むブランチ名を処理できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `* feature/special-chars_123 abc1234 Commit
  feature/日本語ブランチ      def5678 日本語コミット`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getBranches(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.name).toBe("feature/special-chars_123");
        expect(result.data[1]?.name).toBe("feature/日本語ブランチ");
      }
    });
  });
});

describe("getCurrentBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("現在のブランチ名を取得できる", async () => {
    const mockCwd = "/test/repo";
    const mockOutput = "main\n";

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: true,
      data: mockOutput,
    });

    const result = await getCurrentBranch(mockCwd);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("main");
    }

    expect(utils.executeGitCommand).toHaveBeenCalledWith(
      ["branch", "--show-current"],
      mockCwd,
    );
  });

  it("detached HEAD状態の場合はエラーを返す", async () => {
    const mockCwd = "/test/repo";
    const mockOutput = "";

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: true,
      data: mockOutput,
    });

    const result = await getCurrentBranch(mockCwd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("COMMAND_FAILED");
      expect(result.error.message).toContain("detached HEAD");
    }
  });

  it("Gitリポジトリでない場合", async () => {
    const mockCwd = "/test/not-a-repo";

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: false,
      error: {
        code: "NOT_A_REPOSITORY",
        message: `Not a git repository: ${mockCwd}`,
        command: "git branch --show-current",
      },
    });

    const result = await getCurrentBranch(mockCwd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NOT_A_REPOSITORY");
    }
  });
});

describe("branchExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ブランチが存在する場合trueを返す", async () => {
    const mockCwd = "/test/repo";

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: true,
      data: "abc1234\n",
    });

    const result = await branchExists(mockCwd, "main");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(true);
    }

    expect(utils.executeGitCommand).toHaveBeenCalledWith(
      ["rev-parse", "--verify", "main"],
      mockCwd,
    );
  });

  it("ブランチが存在しない場合falseを返す", async () => {
    const mockCwd = "/test/repo";

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: false,
      error: {
        code: "COMMAND_FAILED",
        message: "Command failed",
        command: "git rev-parse --verify nonexistent",
        stderr: "fatal: Needed a single revision",
      },
    });

    const result = await branchExists(mockCwd, "nonexistent");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(false);
    }
  });

  it("Gitリポジトリでない場合", async () => {
    const mockCwd = "/test/not-a-repo";

    vi.mocked(utils.executeGitCommand).mockResolvedValue({
      success: false,
      error: {
        code: "NOT_A_REPOSITORY",
        message: `Not a git repository: ${mockCwd}`,
        command: "git rev-parse --verify main",
      },
    });

    const result = await branchExists(mockCwd, "main");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(false);
    }
  });
});
