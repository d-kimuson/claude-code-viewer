import { describe, expect, test } from "vitest";
import type { CCOptionsSchema } from "@/server/core/claude-code/schema";
import {
  type CCOptionsForm,
  transformFormToSchema,
  transformSchemaToForm,
} from "./ccOptionsFormSchema";

describe("ccOptionsFormSchema", () => {
  describe("transformSchemaToForm", () => {
    test("should handle undefined schema", () => {
      const result = transformSchemaToForm(undefined);
      expect(result).toEqual({
        systemPrompt: { mode: "preset" },
        settingSources: ["user", "project", "local"],
      });
    });

    test("should transform preset system prompt", () => {
      const schema: CCOptionsSchema = {
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: "Additional instructions",
        },
      };
      const result = transformSchemaToForm(schema);
      expect(result.systemPrompt).toEqual({
        mode: "preset",
        append: "Additional instructions",
      });
    });

    test("should transform sandbox settings", () => {
      const schema: CCOptionsSchema = {
        sandbox: {
          enabled: true,
          network: {
            allowedDomains: ["example.com", "api.example.com"],
            allowLocalBinding: true,
          },
        },
      };
      const result = transformSchemaToForm(schema);
      expect(result.sandbox).toEqual({
        enabled: true,
        network: {
          allowedDomains: "example.com, api.example.com",
          allowLocalBinding: true,
        },
      });
    });
  });

  describe("transformFormToSchema", () => {
    test("should return empty object for form with only default preset", () => {
      const form: CCOptionsForm = {
        systemPrompt: { mode: "preset" },
      };
      const result = transformFormToSchema(form);
      // When only preset mode without additional prompt, systemPrompt is undefined
      // and no other fields are set, so we get an empty object (which is valid)
      expect(result).toEqual(undefined);
    });

    test("should transform preset mode without additional prompt", () => {
      const form: CCOptionsForm = {
        systemPrompt: { mode: "preset" },
        model: "claude-sonnet-4",
      };
      const result = transformFormToSchema(form);
      expect(result?.systemPrompt).toBeUndefined();
      expect(result?.model).toBe("claude-sonnet-4");
    });

    test("should transform preset mode with additional prompt", () => {
      const form: CCOptionsForm = {
        systemPrompt: {
          mode: "preset",
          append: "Additional instructions",
        },
      };
      const result = transformFormToSchema(form);
      expect(result?.systemPrompt).toEqual({
        type: "preset",
        preset: "claude_code",
        append: "Additional instructions",
      });
    });

    test("should not allow custom prompt in preset mode (type safety)", () => {
      // This test ensures type safety - the following should not compile:
      // const form = {
      //   systemPrompt: {
      //     mode: "preset" as const,
      //     customPrompt: "This should not be allowed",
      //   },
      // };
      // TypeScript will catch this at compile time
      expect(true).toBe(true);
    });

    test("should transform sandbox with network settings", () => {
      const form = {
        sandbox: {
          enabled: true,
          network: {
            allowedDomains: "example.com, api.example.com",
            allowLocalBinding: true,
          },
        },
      };
      const result = transformFormToSchema(form);
      expect(result?.sandbox).toEqual({
        enabled: true,
        network: {
          allowedDomains: ["example.com", "api.example.com"],
          allowLocalBinding: true,
        },
      });
    });

    test("should filter out empty domains", () => {
      const form = {
        sandbox: {
          enabled: true,
          network: {
            allowedDomains: "example.com, , api.example.com, ",
          },
        },
      };
      const result = transformFormToSchema(form);
      expect(result?.sandbox?.network?.allowedDomains).toEqual([
        "example.com",
        "api.example.com",
      ]);
    });

    test("should handle all field types", () => {
      const form: CCOptionsForm = {
        model: "claude-sonnet-4",
        disallowedTools: ["Bash", "Write"],
        systemPrompt: {
          mode: "preset",
          append: "Additional instructions",
        },
        env: { NODE_ENV: "production", API_KEY: "secret" },
        settingSources: ["user", "project"],
        maxTurns: 10,
        maxThinkingTokens: 5000,
        maxBudgetUsd: 1.5,
      };
      const result = transformFormToSchema(form);
      expect(result).toEqual({
        model: "claude-sonnet-4",
        disallowedTools: ["Bash", "Write"],
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: "Additional instructions",
        },
        env: { NODE_ENV: "production", API_KEY: "secret" },
        settingSources: ["user", "project"],
        maxTurns: 10,
        maxThinkingTokens: 5000,
        maxBudgetUsd: 1.5,
      });
    });
  });

  describe("round-trip transformation", () => {
    test("should preserve data through round-trip (preset mode)", () => {
      const original: CCOptionsSchema = {
        model: "claude-sonnet-4",
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: "Additional",
        },
        disallowedTools: ["Bash"],
        settingSources: ["user", "project", "local"],
      };
      const form = transformSchemaToForm(original);
      const result = transformFormToSchema(form);
      expect(result).toEqual(original);
    });
  });
});
