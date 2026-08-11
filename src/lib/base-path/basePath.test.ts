import { describe, expect, test } from "vitest";
import { getBasePathHref, joinBasePath, normalizeBasePath, stripBasePath } from "./basePath";

describe("normalizeBasePath", () => {
  test.each([
    [undefined, "/"],
    ["", "/"],
    ["/", "/"],
    ["ccv", "/ccv"],
    ["/ccv/", "/ccv"],
    [" docs/ccv ", "/docs/ccv"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeBasePath(input)).toBe(expected);
  });

  test.each([
    "../ccv",
    "/ccv/../admin",
    "\\ccv",
    "/ccv?x=1",
    "/ccv#hash",
    "/ccv path",
    "/ccv/%2e%2e",
  ])("rejects unsafe base path %s", (input) => {
    expect(() => normalizeBasePath(input)).toThrow("Invalid base path");
  });
});

describe("base path URL helpers", () => {
  test("joins root and nested base paths", () => {
    expect(joinBasePath("/", "/api/version")).toBe("/api/version");
    expect(joinBasePath("/ccv", "/api/version")).toBe("/ccv/api/version");
  });

  test("creates a trailing-slash href", () => {
    expect(getBasePathHref("/")).toBe("/");
    expect(getBasePathHref("/ccv")).toBe("/ccv/");
  });

  test("strips only complete matching prefixes", () => {
    expect(stripBasePath("/ccv/api", "/ccv")).toBe("/api");
    expect(stripBasePath("/ccv", "/ccv")).toBe("/");
    expect(stripBasePath("/ccv-other/api", "/ccv")).toBeUndefined();
    expect(stripBasePath("/api", "/")).toBe("/api");
  });
});
