import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCommits } from "./getCommits";
import * as utils from "./utils";

vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof utils>();
  return {
    ...actual,
    executeGitCommand: vi.fn(),
  };
});

describe("getCommits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("正常系", () => {
    it("コミット一覧を取得できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `abc123|feat: add new feature|John Doe|2024-01-15 10:30:00 +0900
def456|fix: bug fix|Jane Smith|2024-01-14 09:20:00 +0900
ghi789|chore: update deps|Bob Johnson|2024-01-13 08:10:00 +0900`;


      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getCommits(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0]).toEqual({
          sha: "abc123",
          message: "feat: add new feature",
          author: "John Doe",
          date: "2024-01-15 10:30:00 +0900",
        });
        expect(result.data[1]).toEqual({
          sha: "def456",
          message: "fix: bug fix",
          author: "Jane Smith",
          date: "2024-01-14 09:20:00 +0900",
        });
        expect(result.data[2]).toEqual({
          sha: "ghi789",
          message: "chore: update deps",
          author: "Bob Johnson",
          date: "2024-01-13 08:10:00 +0900",
        });
      }

      expect(utils.executeGitCommand).toHaveBeenCalledWith(
        [
          "log",
          "--oneline",
          "-n",
          "20",
          "--format=%H|%s|%an|%ad",
          "--date=iso",
        ],
        mockCwd,
      );
    });

    it("空の結果を返す（コミットがない場合）", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = "";


      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getCommits(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("不正な形式の行をスキップする", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `abc123|feat: add new feature|John Doe|2024-01-15 10:30:00 +0900
invalid line without enough pipes
def456|fix: bug fix|Jane Smith|2024-01-14 09:20:00 +0900
||missing data|
ghi789|chore: update deps|Bob Johnson|2024-01-13 08:10:00 +0900`;


      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getCommits(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0]?.sha).toBe("abc123");
        expect(result.data[1]?.sha).toBe("def456");
        expect(result.data[2]?.sha).toBe("ghi789");
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
          command: "git log --oneline -n 20 --format=%H|%s|%an|%ad --date=iso",
        },
      });

      const result = await getCommits(mockCwd);

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
          command: "git log --oneline -n 20 --format=%H|%s|%an|%ad --date=iso",
        },
      });

      const result = await getCommits(mockCwd);

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
          command: "git log",
          stderr:
            "fatal: your current branch 'main' does not have any commits yet",
        },
      });

      const result = await getCommits(mockCwd);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("COMMAND_FAILED");
        expect(result.error.message).toBe("Command failed");
      }
    });
  });

  describe("エッジケース", () => {
    it("特殊文字を含むコミットメッセージを処理できる", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `abc123|feat: add "quotes" & <special> chars|Author Name|2024-01-15 10:30:00 +0900
def456|fix: 日本語メッセージ|日本語 著者|2024-01-14 09:20:00 +0900`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getCommits(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.message).toBe(
          'feat: add "quotes" & <special> chars',
        );
        expect(result.data[1]?.message).toBe("fix: 日本語メッセージ");
        expect(result.data[1]?.author).toBe("日本語 著者");
      }
    });

    it("空白を含むパスでも正常に動作する", async () => {
      const mockCwd = "/test/my repo with spaces";
      const mockOutput = `abc123|feat: test|Author|2024-01-15 10:30:00 +0900`;


      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getCommits(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }

      expect(utils.executeGitCommand).toHaveBeenCalledWith(
        expect.any(Array),
        mockCwd,
      );
    });

    it("空行やスペースのみの行をスキップする", async () => {
      const mockCwd = "/test/repo";
      const mockOutput = `abc123|feat: add feature|Author|2024-01-15 10:30:00 +0900

  
def456|fix: bug|Author|2024-01-14 09:20:00 +0900
  `;


      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = await getCommits(mockCwd);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });
});
