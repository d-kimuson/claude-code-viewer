import { expect, test } from "vitest";
import { applyLayout, reorderLayout } from "./applyLayout";
import { groupProjects } from "./groupProjects";
import { sidebarLayoutSchema } from "./schema";

test("puts new groups first, skips stale keys and separates hidden groups", () => {
  const groups = groupProjects(
    ["a", "b", "c", "d"].map((id, i) => ({
      id,
      projectPath: id,
      claudeProjectPath: id,
      lastModifiedAt: new Date(i * 1000),
      sessionCount: 0,
    })),
  );
  const result = applyLayout(groups, {
    version: 1,
    order: ["missing", "b", "a"],
    hidden: ["b"],
    expanded: [],
  });
  expect(result.visible.map((g) => g.groupKey)).toEqual(["d", "c", "a"]);
  expect(result.hidden.map((g) => g.groupKey)).toEqual(["b"]);
});
test("reorders visible groups while retaining hidden slots", () => {
  expect(
    reorderLayout({ version: 1, order: ["a", "h", "b"], hidden: ["h"], expanded: [] }, [
      "b",
      "n",
      "a",
    ]).order,
  ).toEqual(["b", "h", "n", "a"]);
});
test("enforces all layout limits", () => {
  for (const field of ["order", "hidden", "expanded"]) {
    expect(
      sidebarLayoutSchema.safeParse({
        version: 1,
        order: [],
        hidden: [],
        expanded: [],
        [field]: Array(2001).fill("x"),
      }).success,
    ).toBe(false);
    expect(
      sidebarLayoutSchema.safeParse({
        version: 1,
        order: [],
        hidden: [],
        expanded: [],
        [field]: ["x".repeat(1025)],
      }).success,
    ).toBe(false);
  }
});
test("renders each group once when the stored order repeats a key", () => {
  const groups = groupProjects(
    ["a", "b"].map((id) => ({
      id,
      projectPath: id,
      claudeProjectPath: id,
      lastModifiedAt: new Date(0),
      sessionCount: 0,
    })),
  );
  const result = applyLayout(groups, {
    version: 1,
    order: ["a", "b", "a"],
    hidden: [],
    expanded: [],
  });
  expect(result.visible.map((g) => g.groupKey)).toEqual(["a", "b"]);
});
