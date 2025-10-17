import { describe, expect, it, vi } from "vitest";
import { parseGitBranchesOutput } from "./parseGitBranchesOutput";
import * as utils from "./utils";

describe("getBranches", () => {
  describe("正常系", () => {
    it("ブランチ一覧を取得できる", async () => {
      const mockOutput = `* main                abc1234 [origin/main: ahead 1] Latest commit
  remotes/origin/main abc1234 Latest commit
  feature             def5678 [origin/feature] Feature commit`;

      const result = parseGitBranchesOutput(mockOutput);

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
    });

    it("ahead/behindの両方を持つブランチを処理できる", async () => {
      const mockOutput =
        "* main     abc1234 [origin/main: ahead 2, behind 3] Commit message";

      const result = parseGitBranchesOutput(mockOutput);

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
      const mockOutput = `* main                abc1234 [origin/main] Latest commit
  remotes/origin/main abc1234 Latest commit
  feature             def5678 Feature commit
  remotes/origin/feature def5678 Feature commit`;

      const result = parseGitBranchesOutput(mockOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.name).toBe("main");
        expect(result.data[1]?.name).toBe("feature");
      }
    });

    it("空の結果を返す（ブランチがない場合）", async () => {
      const mockOutput = "";

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = parseGitBranchesOutput(mockOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("不正な形式の行をスキップする", async () => {
      const mockOutput = `* main     abc1234 [origin/main] Latest commit
invalid line
  feature  def5678 Feature commit`;

      vi.mocked(utils.executeGitCommand).mockResolvedValue({
        success: true,
        data: mockOutput,
      });

      const result = parseGitBranchesOutput(mockOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.name).toBe("main");
        expect(result.data[1]?.name).toBe("feature");
      }
    });
  });

  describe("エッジケース", () => {
    it("特殊文字を含むブランチ名を処理できる", async () => {
      const mockOutput = `* feature/special-chars_123 abc1234 Commit
  feature/日本語ブランチ      def5678 日本語コミット`;

      const result = parseGitBranchesOutput(mockOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.name).toBe("feature/special-chars_123");
        expect(result.data[1]?.name).toBe("feature/日本語ブランチ");
      }
    });
  });
});
