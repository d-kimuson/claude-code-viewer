import { describe, it, expect } from "vitest";
import { resolveLogLevel } from "./logging.ts";

describe("resolveLogLevel", () => {
  it("returns Debug when verbose is true", () => {
    expect(resolveLogLevel(true).label).toBe("DEBUG");
  });

  it("returns Info when verbose is false", () => {
    expect(resolveLogLevel(false).label).toBe("INFO");
  });

  it("returns Info when verbose is undefined", () => {
    expect(resolveLogLevel(undefined).label).toBe("INFO");
  });
});
