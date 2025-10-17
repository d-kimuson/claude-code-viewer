import path from "node:path";
import { Path } from "@effect/platform";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { computeClaudeProjectFilePath } from "./computeClaudeProjectFilePath";

describe("computeClaudeProjectFilePath", () => {
  const TEST_GLOBAL_CLAUDE_DIR = "/test/mock/claude";
  const TEST_PROJECTS_DIR = path.join(TEST_GLOBAL_CLAUDE_DIR, "projects");

  it("プロジェクトパスからClaudeの設定ディレクトリパスを計算する", async () => {
    const projectPath = "/home/me/dev/example";
    const expected = `${TEST_PROJECTS_DIR}/-home-me-dev-example`;

    const result = await Effect.runPromise(
      computeClaudeProjectFilePath({
        projectPath,
        claudeProjectsDirPath: TEST_PROJECTS_DIR,
      }).pipe(Effect.provide(Path.layer)),
    );

    expect(result).toBe(expected);
  });

  it("末尾にスラッシュがある場合も正しく処理される", async () => {
    const projectPath = "/home/me/dev/example/";
    const expected = `${TEST_PROJECTS_DIR}/-home-me-dev-example`;

    const result = await Effect.runPromise(
      computeClaudeProjectFilePath({
        projectPath,
        claudeProjectsDirPath: TEST_PROJECTS_DIR,
      }).pipe(Effect.provide(Path.layer)),
    );

    expect(result).toBe(expected);
  });
});
