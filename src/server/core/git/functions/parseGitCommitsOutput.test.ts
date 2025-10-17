import { describe, expect, it } from "vitest";
import { parseGitCommitsOutput } from "./parseGitCommitsOutput";

describe("getCommits", () => {
  describe("正常系", () => {
    it("コミット一覧を取得できる", async () => {
      const mockOutput = `abc123|feat: add new feature|John Doe|2024-01-15 10:30:00 +0900
def456|fix: bug fix|Jane Smith|2024-01-14 09:20:00 +0900
ghi789|chore: update deps|Bob Johnson|2024-01-13 08:10:00 +0900`;

      const result = parseGitCommitsOutput(mockOutput);

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
    });

    it("空の結果を返す（コミットがない場合）", async () => {
      const mockOutput = "";
      const result = parseGitCommitsOutput(mockOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("不正な形式の行をスキップする", async () => {
      const mockOutput = `abc123|feat: add new feature|John Doe|2024-01-15 10:30:00 +0900
invalid line without enough pipes
def456|fix: bug fix|Jane Smith|2024-01-14 09:20:00 +0900
||missing data|
ghi789|chore: update deps|Bob Johnson|2024-01-13 08:10:00 +0900`;

      const result = parseGitCommitsOutput(mockOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0]?.sha).toBe("abc123");
        expect(result.data[1]?.sha).toBe("def456");
        expect(result.data[2]?.sha).toBe("ghi789");
      }
    });
  });

  describe("エッジケース", () => {
    it("特殊文字を含むコミットメッセージを処理できる", async () => {
      const mockOutput = `abc123|feat: add "quotes" & <special> chars|Author Name|2024-01-15 10:30:00 +0900
def456|fix: 日本語メッセージ|日本語 著者|2024-01-14 09:20:00 +0900`;

      const result = parseGitCommitsOutput(mockOutput);

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
      const mockOutput = `abc123|feat: test|Author|2024-01-15 10:30:00 +0900`;

      const result = parseGitCommitsOutput(mockOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }
    });

    it("空行やスペースのみの行をスキップする", async () => {
      const mockOutput = `abc123|feat: add feature|Author|2024-01-15 10:30:00 +0900

  
def456|fix: bug|Author|2024-01-14 09:20:00 +0900
  `;

      const result = parseGitCommitsOutput(mockOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });
});
