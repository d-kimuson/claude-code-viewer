import { describe, expect, it } from "vitest";
import { parseGitCommitsOutput } from "./parseGitCommitsOutput.ts";

/**
 * Tests for edge cases involving pipe characters in commit messages.
 *
 * The git log format used is: "%H|%s|%aN|%ai"
 * where %s is the commit subject and may contain "|" characters.
 */
describe("parseGitCommitsOutput - pipe characters in commit message", () => {
  it("correctly handles a commit message containing a pipe character", () => {
    const mockOutput = `abc123|feat: add foo|bar fix|John Doe|2024-01-15 10:30:00 +0900`;

    const result = parseGitCommitsOutput(mockOutput);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toHaveLength(1);
    const commit = result.data[0];
    expect(commit?.sha).toBe("abc123");
    expect(commit?.message).toBe("feat: add foo|bar fix");
    expect(commit?.author).toBe("John Doe");
    expect(commit?.date).toBe("2024-01-15 10:30:00 +0900");
  });

  it("correctly handles a commit message containing multiple pipe characters", () => {
    const mockOutput = `abc123|fix: handle a|b|c case|Jane Smith|2024-01-14 09:00:00 +0900`;

    const result = parseGitCommitsOutput(mockOutput);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toHaveLength(1);
    const commit = result.data[0];
    expect(commit?.sha).toBe("abc123");
    // Full message with pipes intact:
    expect(commit?.message).toBe("fix: handle a|b|c case");
    expect(commit?.author).toBe("Jane Smith");
    expect(commit?.date).toBe("2024-01-14 09:00:00 +0900");
  });

  it("handles normal commits (no pipes in message) correctly as before", () => {
    const mockOutput = `abc123|feat: add new feature|John Doe|2024-01-15 10:30:00 +0900
def456|fix: bug fix|Jane Smith|2024-01-14 09:20:00 +0900`;

    const result = parseGitCommitsOutput(mockOutput);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toHaveLength(2);
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
  });
});
