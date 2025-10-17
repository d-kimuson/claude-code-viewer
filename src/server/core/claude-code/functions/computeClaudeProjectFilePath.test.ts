import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("computeClaudeProjectFilePath", () => {
  const TEST_GLOBAL_CLAUDE_DIR = "/test/mock/claude";
  const TEST_PROJECTS_DIR = path.join(TEST_GLOBAL_CLAUDE_DIR, "projects");

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock("../../../lib/env", () => ({
      env: {
        get: (key: string) => {
          if (key === "GLOBAL_CLAUDE_DIR") {
            return TEST_GLOBAL_CLAUDE_DIR;
          }
          return undefined;
        },
      },
    }));
  });

  it("プロジェクトパスからClaudeの設定ディレクトリパスを計算する", async () => {
    const { computeClaudeProjectFilePath } = await import(
      "./computeClaudeProjectFilePath"
    );

    const projectPath = "/home/me/dev/example";
    const expected = `${TEST_PROJECTS_DIR}/-home-me-dev-example`;

    const result = computeClaudeProjectFilePath(projectPath);

    expect(result).toBe(expected);
  });

  it("末尾にスラッシュがある場合も正しく処理される", async () => {
    const { computeClaudeProjectFilePath } = await import(
      "./computeClaudeProjectFilePath"
    );

    const projectPath = "/home/me/dev/example/";
    const expected = `${TEST_PROJECTS_DIR}/-home-me-dev-example`;

    const result = computeClaudeProjectFilePath(projectPath);

    expect(result).toBe(expected);
  });
});
