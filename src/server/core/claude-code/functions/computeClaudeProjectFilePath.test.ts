import path from "node:path";
import { Path } from "@effect/platform";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { describe, expect } from "vitest";
import { computeClaudeProjectFilePath } from "./computeClaudeProjectFilePath.ts";

describe("computeClaudeProjectFilePath", () => {
  const TEST_GLOBAL_CLAUDE_DIR = "/test/mock/claude";
  const TEST_PROJECTS_DIR = path.join(TEST_GLOBAL_CLAUDE_DIR, "projects");

  it.live("プロジェクトパスからClaudeの設定ディレクトリパスを計算する", () =>
    Effect.gen(function* () {
      const projectPath = "/home/me/dev/example";
      const expected = `${TEST_PROJECTS_DIR}/-home-me-dev-example`;

      const result = yield* computeClaudeProjectFilePath({
        projectPath,
        claudeProjectsDirPath: TEST_PROJECTS_DIR,
      });

      expect(result).toBe(expected);
    }).pipe(Effect.provide(Path.layer)),
  );

  it.live("末尾にスラッシュがある場合も正しく処理される", () =>
    Effect.gen(function* () {
      const projectPath = "/home/me/dev/example/";
      const expected = `${TEST_PROJECTS_DIR}/-home-me-dev-example`;

      const result = yield* computeClaudeProjectFilePath({
        projectPath,
        claudeProjectsDirPath: TEST_PROJECTS_DIR,
      });

      expect(result).toBe(expected);
    }).pipe(Effect.provide(Path.layer)),
  );
});
