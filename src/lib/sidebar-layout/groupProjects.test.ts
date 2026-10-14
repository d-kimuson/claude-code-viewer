import { expect, test } from "vitest";
import { groupProjects } from "./groupProjects";

const project = (id: string, projectPath: string | null) => ({
  id,
  projectPath,
  claudeProjectPath: id,
  lastModifiedAt: "2026-10-09",
  sessionCount: 1,
});
test("groups real worktree, scratch, normal and unknown paths", () => {
  const groups = groupProjects([
    project("main", "/Users/alice/Projects/app"),
    project("work", "/Users/alice/Projects/app/.claude/worktrees/feature-a"),
    project("windows", "D:\\app\\.claude\\worktrees\\feature-b"),
    project(
      "scratch",
      "/Users/alice/Library/Application Support/Claude/scratch-workspaces/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002/scratch-2026-10-09-0eb9b7",
    ),
    project("normal", "/Users/alice/blog"),
    project("pan", "D:\\Shop"),
    project("tmp", "/private/tmp"),
    project("unknown", null),
    project("empty", ""),
  ]);
  expect(groups.map((g) => g.groupKey)).toEqual([
    "/Users/alice/Projects/app",
    "D:\\app",
    "__no_project__",
    "/Users/alice/blog",
    "D:\\Shop",
    "/private/tmp",
    "__unknown__:unknown",
    "__unknown__:empty",
  ]);
  expect(groups[0]?.members.map((m) => m.worktreeName)).toEqual([null, "feature-a"]);
  expect(groups[1]?.members[0]?.worktreeName).toBe("feature-b");
});

test("groups Windows desktop scratch workspaces with macOS scratch sessions", () => {
  const groups = groupProjects([
    project(
      "windows-scratch",
      "C:\\Users\\alice\\AppData\\Roaming\\Claude\\scratch-workspaces\\00000000-0000-4000-8000-000000000001\\00000000-0000-4000-8000-000000000002\\scratch-2026-09-08-1bbd92",
    ),
  ]);
  expect(groups[0]?.groupKey).toBe("__no_project__");
});
