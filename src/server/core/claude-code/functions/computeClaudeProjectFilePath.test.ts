import path from "node:path";
import { describe, expect, it } from "vitest";

describe("computeClaudeProjectFilePath", () => {
  const TEST_GLOBAL_CLAUDE_DIR = "/test/mock/claude";
  const TEST_PROJECTS_DIR = path.join(TEST_GLOBAL_CLAUDE_DIR, "projects");

  it("プロジェクトパスからClaudeの設定ディレクトリパスを計算する", async () => {
    const { computeClaudeProjectFilePath } = await import(
      "./computeClaudeProjectFilePath"
    );

    const projectPath = "/home/me/dev/example";
    const expected = `${TEST_PROJECTS_DIR}/-home-me-dev-example`;

    const result = computeClaudeProjectFilePath({
      projectPath,
      claudeProjectsDirPath: TEST_PROJECTS_DIR,
    });

    expect(result).toBe(expected);
  });

  it("末尾にスラッシュがある場合も正しく処理される", async () => {
    const { computeClaudeProjectFilePath } = await import(
      "./computeClaudeProjectFilePath"
    );

    const projectPath = "/home/me/dev/example/";
    const expected = `${TEST_PROJECTS_DIR}/-home-me-dev-example`;

    const result = computeClaudeProjectFilePath({
      projectPath,
      claudeProjectsDirPath: TEST_PROJECTS_DIR,
    });

    expect(result).toBe(expected);
  });
});
