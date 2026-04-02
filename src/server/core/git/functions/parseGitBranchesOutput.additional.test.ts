import { describe, expect, it } from "vitest";
import { parseGitBranchesOutput } from "./parseGitBranchesOutput.ts";

const expectSuccess = (result: ReturnType<typeof parseGitBranchesOutput>) => {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error("Expected success");
  return result;
};

describe("parseGitBranchesOutput - additional edge cases", () => {
  describe("behind-only tracking info", () => {
    it("correctly parses behind count without ahead", () => {
      const mockOutput = "* main     abc1234 [origin/main: behind 5] Commit message";

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        name: "main",
        current: true,
        remote: "origin/main",
        commit: "abc1234",
        ahead: undefined,
        behind: 5,
      });
    });
  });

  describe("branch with no tracking info (no upstream)", () => {
    it("correctly parses branch without any tracking info", () => {
      const mockOutput = "  feature/no-upstream     def5678 Local commit";

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        name: "feature/no-upstream",
        current: false,
        remote: undefined,
        commit: "def5678",
        ahead: undefined,
        behind: undefined,
      });
    });
  });

  describe("remote-only branch (no local equivalent)", () => {
    it("includes remote-only branch when there is no local branch with the same name", () => {
      const mockOutput = "  remotes/origin/feature-remote     abc1234 Remote commit";

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      // No local "feature-remote", so the remote branch should be included
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.name).toBe("feature-remote");
    });

    it("excludes remote branch when local branch with same name already seen", () => {
      const mockOutput = `  feature     abc1234 Local commit
  remotes/origin/feature     abc1234 Local commit`;

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      // local "feature" was seen first, so remotes/origin/feature is skipped
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.name).toBe("feature");
    });
  });

  describe("current branch marker", () => {
    it("correctly identifies non-current branch (no asterisk)", () => {
      const mockOutput = "  develop     abc1234 Some commit";

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      expect(result.data[0]?.current).toBe(false);
    });

    it("correctly identifies current branch (with asterisk)", () => {
      const mockOutput = "* develop     abc1234 Some commit";

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      expect(result.data[0]?.current).toBe(true);
    });
  });

  describe("tracking with ahead and behind", () => {
    it("correctly parses behind-only on current branch", () => {
      const mockOutput = "* main     abc1234 [origin/main: behind 2] Latest";

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      expect(result.data[0]?.ahead).toBeUndefined();
      expect(result.data[0]?.behind).toBe(2);
    });

    it("correctly parses ahead-only (no behind)", () => {
      const mockOutput = "* main     abc1234 [origin/main: ahead 3] Latest";

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      expect(result.data[0]?.ahead).toBe(3);
      expect(result.data[0]?.behind).toBeUndefined();
    });

    it("correctly parses branch tracking but with no divergence (neither ahead nor behind)", () => {
      const mockOutput = "* main     abc1234 [origin/main] Latest";

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      expect(result.data[0]?.remote).toBe("origin/main");
      expect(result.data[0]?.ahead).toBeUndefined();
      expect(result.data[0]?.behind).toBeUndefined();
    });
  });

  describe("multiple branches with mixed tracking", () => {
    it("handles a realistic mixed branch list", () => {
      // NOTE: commit SHAs must be valid hex (a-f, 0-9) to match the regex [a-f0-9]+
      const mockOutput = `* main          abc1234 [origin/main: ahead 1, behind 2] Latest commit
  develop       def5678 [origin/develop] Dev commit
  local-only    abc9012 Local only commit
  remotes/origin/main          abc1234 Latest commit
  remotes/origin/develop       def5678 Dev commit
  remotes/origin/remote-only   beef56 Remote only commit`;

      const result = expectSuccess(parseGitBranchesOutput(mockOutput));

      // main (local), develop (local), local-only (local), remote-only (no local equiv)
      expect(result.data).toHaveLength(4);

      const names = result.data.map((b) => b.name);
      expect(names).toContain("main");
      expect(names).toContain("develop");
      expect(names).toContain("local-only");
      expect(names).toContain("remote-only");

      const main = result.data.find((b) => b.name === "main");
      expect(main?.ahead).toBe(1);
      expect(main?.behind).toBe(2);
      expect(main?.current).toBe(true);

      const localOnly = result.data.find((b) => b.name === "local-only");
      expect(localOnly?.remote).toBeUndefined();
    });
  });
});
