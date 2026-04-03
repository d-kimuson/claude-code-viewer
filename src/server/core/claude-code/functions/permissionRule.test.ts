import { describe, expect, test } from "vitest";
import {
  generatePermissionRule,
  matchAnyRule,
  matchPermissionRule,
  parsePermissionRule,
} from "./permissionRule";

describe("parsePermissionRule", () => {
  test("tool name only", () => {
    expect(parsePermissionRule("Bash")).toEqual({
      toolPattern: "Bash",
      specifier: undefined,
    });
  });

  test("tool name with command specifier", () => {
    expect(parsePermissionRule("Bash(git status)")).toEqual({
      toolPattern: "Bash",
      specifier: "git status",
    });
  });

  test("tool name with glob specifier", () => {
    expect(parsePermissionRule("Edit(/src/**/*.ts)")).toEqual({
      toolPattern: "Edit",
      specifier: "/src/**/*.ts",
    });
  });

  test("MCP tool with wildcard in name", () => {
    expect(parsePermissionRule("mcp__obsidian__*")).toEqual({
      toolPattern: "mcp__obsidian__*",
      specifier: undefined,
    });
  });

  test("tool name with wildcard specifier", () => {
    expect(parsePermissionRule("Bash(*)")).toEqual({
      toolPattern: "Bash",
      specifier: "*",
    });
  });
});

describe("generatePermissionRule", () => {
  test("Bash tool with command", () => {
    expect(generatePermissionRule("Bash", { command: "git status" }, "/home/user/project")).toBe(
      "Bash(git status)",
    );
  });

  test("Edit tool with file_path in project", () => {
    expect(
      generatePermissionRule(
        "Edit",
        { file_path: "/home/user/project/src/foo.ts" },
        "/home/user/project",
      ),
    ).toBe("Edit(/src/foo.ts)");
  });

  test("Write tool with file_path in project", () => {
    expect(
      generatePermissionRule(
        "Write",
        { file_path: "/home/user/project/src/bar.ts" },
        "/home/user/project",
      ),
    ).toBe("Write(/src/bar.ts)");
  });

  test("Read tool with file_path in project", () => {
    expect(
      generatePermissionRule(
        "Read",
        { file_path: "/home/user/project/.env" },
        "/home/user/project",
      ),
    ).toBe("Read(/.env)");
  });

  test("MCP tool returns tool name only", () => {
    expect(generatePermissionRule("mcp__obsidian__search_vault", {}, "/home/user/project")).toBe(
      "mcp__obsidian__search_vault",
    );
  });

  test("generic tool without known specifier returns tool name only", () => {
    expect(
      generatePermissionRule("WebFetch", { url: "https://example.com" }, "/home/user/project"),
    ).toBe("WebFetch");
  });

  test("Edit with file outside project uses absolute path", () => {
    expect(generatePermissionRule("Edit", { file_path: "/tmp/foo.ts" }, "/home/user/project")).toBe(
      "Edit(/tmp/foo.ts)",
    );
  });

  test("Bash with no command returns tool name only", () => {
    expect(generatePermissionRule("Bash", {}, "/home/user/project")).toBe("Bash");
  });

  test("MultiEdit tool with file_path in project", () => {
    expect(
      generatePermissionRule(
        "MultiEdit",
        { file_path: "/home/user/project/src/a.ts" },
        "/home/user/project",
      ),
    ).toBe("MultiEdit(/src/a.ts)");
  });
});

describe("matchPermissionRule", () => {
  const cwd = "/home/user/project";

  test("tool name only matches any call of that tool", () => {
    expect(matchPermissionRule("Bash", "Bash", { command: "anything" }, cwd)).toBe(true);
  });

  test("exact command specifier matches", () => {
    expect(matchPermissionRule("Bash(git status)", "Bash", { command: "git status" }, cwd)).toBe(
      true,
    );
  });

  test("exact command specifier does not match different command", () => {
    expect(matchPermissionRule("Bash(git status)", "Bash", { command: "git push" }, cwd)).toBe(
      false,
    );
  });

  test("glob with space before * matches word boundary", () => {
    expect(matchPermissionRule("Bash(git *)", "Bash", { command: "git status" }, cwd)).toBe(true);
  });

  test("glob with space before * does not match without boundary", () => {
    expect(matchPermissionRule("Bash(git *)", "Bash", { command: "gitignore" }, cwd)).toBe(false);
  });

  test("glob without space matches no boundary", () => {
    expect(matchPermissionRule("Bash(git*)", "Bash", { command: "gitignore" }, cwd)).toBe(true);
  });

  test("Edit glob matches file in project", () => {
    expect(
      matchPermissionRule(
        "Edit(/src/**/*.ts)",
        "Edit",
        { file_path: "/home/user/project/src/components/App.ts" },
        cwd,
      ),
    ).toBe(true);
  });

  test("Edit glob does not match wrong extension", () => {
    expect(
      matchPermissionRule(
        "Edit(/src/**/*.ts)",
        "Edit",
        { file_path: "/home/user/project/src/foo.js" },
        cwd,
      ),
    ).toBe(false);
  });

  test("Edit without specifier matches any Edit", () => {
    expect(matchPermissionRule("Edit", "Edit", { file_path: "/any/path" }, cwd)).toBe(true);
  });

  test("MCP wildcard matches MCP tool", () => {
    expect(matchPermissionRule("mcp__obsidian__*", "mcp__obsidian__search_vault", {}, cwd)).toBe(
      true,
    );
  });

  test("exact MCP tool does not match different MCP tool", () => {
    expect(
      matchPermissionRule("mcp__obsidian__search_vault", "mcp__obsidian__create_note", {}, cwd),
    ).toBe(false);
  });

  test("tool name match is case-insensitive for builtins", () => {
    expect(matchPermissionRule("bash", "Bash", { command: "ls" }, cwd)).toBe(true);
  });

  test("tool name mismatch returns false", () => {
    expect(matchPermissionRule("Bash(git *)", "Edit", { command: "git status" }, cwd)).toBe(false);
  });

  test("Bash(*) is equivalent to Bash (matches all)", () => {
    expect(matchPermissionRule("Bash(*)", "Bash", { command: "anything" }, cwd)).toBe(true);
  });

  test("Edit with absolute path matches file outside project", () => {
    expect(
      matchPermissionRule("Edit(/tmp/foo.ts)", "Edit", { file_path: "/tmp/foo.ts" }, cwd),
    ).toBe(true);
  });

  test("Edit with absolute path does not match different file", () => {
    expect(
      matchPermissionRule("Edit(/tmp/foo.ts)", "Edit", { file_path: "/tmp/bar.ts" }, cwd),
    ).toBe(false);
  });
});

describe("matchAnyRule", () => {
  const cwd = "/home/user/project";

  test("empty rules returns false", () => {
    expect(matchAnyRule([], "Bash", { command: "ls" }, cwd)).toBe(false);
  });

  test("one matching rule returns true", () => {
    expect(matchAnyRule(["Bash(git *)"], "Bash", { command: "git status" }, cwd)).toBe(true);
  });

  test("no matching rule returns false", () => {
    expect(matchAnyRule(["Edit(/src/**)"], "Bash", { command: "ls" }, cwd)).toBe(false);
  });

  test("multiple rules, one matches returns true", () => {
    expect(
      matchAnyRule(["Edit(/src/**)", "Bash(git *)"], "Bash", { command: "git status" }, cwd),
    ).toBe(true);
  });
});
