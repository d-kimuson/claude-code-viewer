import { z } from "zod";

export const mediaTypeSchema = z.enum([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export type MediaType = z.infer<typeof mediaTypeSchema>;

/**
 * Schema for image block parameter
 */
const imageBlockSchema = z.object({
  type: z.literal("image"),
  source: z.object({
    type: z.literal("base64"),
    media_type: mediaTypeSchema,
    data: z.string(),
  }),
});

export type ImageBlockParam = z.infer<typeof imageBlockSchema>;

/**
 * Schema for document block parameter
 */
const documentBlockSchema = z.object({
  type: z.literal("document"),
  source: z.union([
    z.object({
      type: z.literal("text"),
      media_type: z.enum(["text/plain"]),
      data: z.string(),
    }),
    z.object({
      type: z.literal("base64"),
      media_type: z.enum(["application/pdf"]),
      data: z.string(),
    }),
  ]),
});

export type DocumentBlockParam = z.infer<typeof documentBlockSchema>;

/**
 * Schema for user message input with optional images and documents
 */
export const userMessageInputSchema = z.object({
  text: z.string().min(1),
  images: z.array(imageBlockSchema).optional(),
  documents: z.array(documentBlockSchema).optional(),
});

export type UserMessageInputSchema = z.infer<typeof userMessageInputSchema>;

/**
 * Schema for sandbox network configuration
 */
export const sandboxNetworkConfigSchema = z.object({
  allowedDomains: z.array(z.string()).optional(),
  allowUnixSockets: z.array(z.string()).optional(),
  allowAllUnixSockets: z.boolean().optional(),
  allowLocalBinding: z.boolean().optional(),
  httpProxyPort: z.number().optional(),
  socksProxyPort: z.number().optional(),
});

export type SandboxNetworkConfig = z.infer<typeof sandboxNetworkConfigSchema>;

/**
 * Schema for sandbox settings
 */
export const sandboxSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  autoAllowBashIfSandboxed: z.boolean().optional(),
  allowUnsandboxedCommands: z.boolean().optional(),
  network: sandboxNetworkConfigSchema.optional(),
});

export type SandboxSettings = z.infer<typeof sandboxSettingsSchema>;

/**
 * Schema for Claude Code options (CCOptions)
 * Based on @anthropic-ai/claude-agent-sdk Options type
 */
export const ccOptionsSchema = z.object({
  disallowedTools: z.array(z.string()).optional(),
  settingSources: z.array(z.enum(["user", "project", "local"])).optional(),
  systemPrompt: z
    .union([
      z.string(),
      z.object({
        type: z.literal("preset"),
        preset: z.literal("claude_code"),
        append: z.string().optional(),
      }),
    ])
    .optional(),
  model: z.string().optional(),
  sandbox: sandboxSettingsSchema.optional(),
  maxTurns: z.number().optional(),
  maxThinkingTokens: z.number().optional(),
  env: z.record(z.string(), z.string().optional()).optional(),
  maxBudgetUsd: z.number().optional(),
});

export type CCOptionsSchema = z.infer<typeof ccOptionsSchema>;
