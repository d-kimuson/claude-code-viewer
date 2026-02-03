import { z } from "zod";
import type { CCOptionsSchema } from "@/server/core/claude-code/schema";

/**
 * Frontend form schema for CC Options
 * This is a user-friendly representation that will be transformed to CCOptionsSchema
 */

// System Prompt ADT (Algebraic Data Type)
export const systemPromptFormSchema = z.object({
  mode: z.literal("preset"),
  append: z.string().optional(),
});

export type SystemPromptForm = z.infer<typeof systemPromptFormSchema>;

// Sandbox Network Config
export const sandboxNetworkFormSchema = z.object({
  allowedDomains: z.string().optional(), // comma-separated string in form
  allowLocalBinding: z.boolean().optional(),
});

export type SandboxNetworkForm = z.infer<typeof sandboxNetworkFormSchema>;

// Sandbox Settings
export const sandboxFormSchema = z.object({
  enabled: z.boolean().optional(),
  autoAllowBashIfSandboxed: z.boolean().optional(),
  allowUnsandboxedCommands: z.boolean().optional(),
  network: sandboxNetworkFormSchema.optional(),
});

export type SandboxForm = z.infer<typeof sandboxFormSchema>;

// Main CC Options Form Schema
export const ccOptionsFormSchema = z.object({
  model: z.string().optional(),
  disallowedTools: z.array(z.string()).optional(),
  systemPrompt: systemPromptFormSchema.optional(),
  env: z.record(z.string(), z.string().optional()).optional(),
  sandbox: sandboxFormSchema.optional(),
  settingSources: z.array(z.enum(["user", "project", "local"])).optional(),
  maxTurns: z.number().int().positive().optional(),
  maxThinkingTokens: z.number().int().positive().optional(),
  maxBudgetUsd: z.number().nonnegative().optional(),
});

export type CCOptionsForm = z.infer<typeof ccOptionsFormSchema>;

const defaultSettingSources: Array<"user" | "project" | "local"> = [
  "user",
  "project",
  "local",
];

/**
 * Transform frontend form data to backend schema
 */
export function transformFormToSchema(
  form: CCOptionsForm,
): CCOptionsSchema | undefined {
  const hasValue = (value: unknown): boolean => {
    if (value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object" && value !== null)
      return Object.keys(value).length > 0;
    return true;
  };

  const parseAllowedDomains = (value: string | undefined) => {
    if (!value) return undefined;
    const domains = value
      .split(",")
      .map((domain) => domain.trim())
      .filter(Boolean);
    return domains.length > 0 ? domains : undefined;
  };

  const buildNetwork = (network: SandboxNetworkForm | undefined) => {
    if (!network) return undefined;

    const allowedDomains = parseAllowedDomains(network.allowedDomains);
    const allowLocalBinding = network.allowLocalBinding;

    const result = {
      ...(allowedDomains ? { allowedDomains } : {}),
      ...(allowLocalBinding !== undefined ? { allowLocalBinding } : {}),
    };

    return hasValue(result) ? result : undefined;
  };

  const buildSandbox = (sandbox: SandboxForm | undefined) => {
    if (!sandbox) return undefined;

    const network = buildNetwork(sandbox.network);
    const result = {
      ...(sandbox.enabled !== undefined ? { enabled: sandbox.enabled } : {}),
      ...(sandbox.autoAllowBashIfSandboxed !== undefined
        ? { autoAllowBashIfSandboxed: sandbox.autoAllowBashIfSandboxed }
        : {}),
      ...(sandbox.allowUnsandboxedCommands !== undefined
        ? { allowUnsandboxedCommands: sandbox.allowUnsandboxedCommands }
        : {}),
      ...(network ? { network } : {}),
    };

    return hasValue(result) ? result : undefined;
  };

  const buildSystemPrompt = (
    systemPrompt: SystemPromptForm | undefined,
  ): CCOptionsSchema["systemPrompt"] | undefined => {
    if (systemPrompt?.mode !== "preset" || !systemPrompt.append) {
      return undefined;
    }

    return {
      type: "preset",
      preset: "claude_code",
      append: systemPrompt.append,
    };
  };

  // If all fields are empty/undefined, return undefined
  const hasAnyValue = Object.values(form).some((value) => hasValue(value));

  if (!hasAnyValue) {
    return undefined;
  }

  const systemPrompt = buildSystemPrompt(form.systemPrompt);
  const sandbox = buildSandbox(form.sandbox);
  const env = form.env && hasValue(form.env) ? form.env : undefined;

  const result: CCOptionsSchema = {
    ...(form.model ? { model: form.model } : {}),
    ...(form.disallowedTools?.length
      ? { disallowedTools: form.disallowedTools }
      : {}),
    ...(systemPrompt ? { systemPrompt } : {}),
    ...(env ? { env } : {}),
    ...(sandbox ? { sandbox } : {}),
    ...(form.settingSources?.length
      ? { settingSources: form.settingSources }
      : {}),
    ...(form.maxTurns !== undefined ? { maxTurns: form.maxTurns } : {}),
    ...(form.maxThinkingTokens !== undefined
      ? { maxThinkingTokens: form.maxThinkingTokens }
      : {}),
    ...(form.maxBudgetUsd !== undefined
      ? { maxBudgetUsd: form.maxBudgetUsd }
      : {}),
  };

  return hasValue(result) ? result : undefined;
}

/**
 * Transform backend schema to frontend form data
 */
export function transformSchemaToForm(
  schema: CCOptionsSchema | undefined,
): CCOptionsForm {
  if (!schema) {
    return {
      systemPrompt: { mode: "preset" },
      settingSources: [...defaultSettingSources],
    };
  }

  const form: CCOptionsForm = {
    settingSources: [...defaultSettingSources],
  };

  // Model
  if (schema.model) {
    form.model = schema.model;
  }

  // Disallowed Tools
  if (schema.disallowedTools) {
    form.disallowedTools = schema.disallowedTools;
  }

  // System Prompt (ADT transformation)
  if (schema.systemPrompt === undefined) {
    form.systemPrompt = { mode: "preset" };
  } else if (typeof schema.systemPrompt !== "string") {
    form.systemPrompt = {
      mode: "preset",
      append: schema.systemPrompt.append,
    };
  }

  // Environment Variables
  if (schema.env) {
    form.env = schema.env;
  }

  // Sandbox
  if (schema.sandbox) {
    const sandbox: SandboxForm = {};

    if (schema.sandbox.enabled !== undefined) {
      sandbox.enabled = schema.sandbox.enabled;
    }

    if (schema.sandbox.autoAllowBashIfSandboxed !== undefined) {
      sandbox.autoAllowBashIfSandboxed =
        schema.sandbox.autoAllowBashIfSandboxed;
    }

    if (schema.sandbox.allowUnsandboxedCommands !== undefined) {
      sandbox.allowUnsandboxedCommands =
        schema.sandbox.allowUnsandboxedCommands;
    }

    if (schema.sandbox.network) {
      const network: SandboxNetworkForm = {};

      if (schema.sandbox.network.allowedDomains) {
        network.allowedDomains =
          schema.sandbox.network.allowedDomains.join(", ");
      }

      if (schema.sandbox.network.allowLocalBinding !== undefined) {
        network.allowLocalBinding = schema.sandbox.network.allowLocalBinding;
      }

      sandbox.network = network;
    }

    form.sandbox = sandbox;
  }

  // Setting Sources
  if (schema.settingSources) {
    form.settingSources = schema.settingSources;
  }

  // Max Turns
  if (schema.maxTurns !== undefined) {
    form.maxTurns = schema.maxTurns;
  }

  // Max Thinking Tokens
  if (schema.maxThinkingTokens !== undefined) {
    form.maxThinkingTokens = schema.maxThinkingTokens;
  }

  // Max Budget USD
  if (schema.maxBudgetUsd !== undefined) {
    form.maxBudgetUsd = schema.maxBudgetUsd;
  }

  return form;
}
