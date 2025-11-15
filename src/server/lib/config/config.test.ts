import { describe, expect, test } from "vitest";
import { userConfigSchema } from "./config";

describe("userConfigSchema", () => {
  describe("autoResumeOnRateLimit", () => {
    test("should default to false", () => {
      const result = userConfigSchema.parse({});
      expect(result.autoResumeOnRateLimit).toBe(false);
    });

    test("should accept true value", () => {
      const result = userConfigSchema.parse({ autoResumeOnRateLimit: true });
      expect(result.autoResumeOnRateLimit).toBe(true);
    });

    test("should accept false value", () => {
      const result = userConfigSchema.parse({ autoResumeOnRateLimit: false });
      expect(result.autoResumeOnRateLimit).toBe(false);
    });

    test("should accept undefined and use default", () => {
      const result = userConfigSchema.parse({
        autoResumeOnRateLimit: undefined,
      });
      expect(result.autoResumeOnRateLimit).toBe(false);
    });
  });
});
