import { describe, expect, test } from "vitest";
import { isDevelopmentEnv } from "./ccvEnv";

describe("isDevelopmentEnv", () => {
  test("returns true only for development", () => {
    expect(isDevelopmentEnv("development")).toBe(true);
    expect(isDevelopmentEnv("production")).toBe(false);
    expect(isDevelopmentEnv("test")).toBe(false);
    expect(isDevelopmentEnv(undefined)).toBe(false);
  });
});
