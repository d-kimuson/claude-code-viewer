import { z } from "zod";
import { TextContentSchema } from "../content/TextContentSchema.ts";
import { ThinkingContentSchema } from "../content/ThinkingContentSchema.ts";
import { ToolResultContentSchema } from "../content/ToolResultContentSchema.ts";
import { ToolUseContentSchema } from "../content/ToolUseContentSchema.ts";

const AssistantMessageContentSchema = z.union([
  ThinkingContentSchema,
  TextContentSchema,
  ToolUseContentSchema,
  ToolResultContentSchema,
]);

export type AssistantMessageContent = z.infer<typeof AssistantMessageContentSchema>;

export const AssistantMessageSchema = z.object({
  id: z.string(),
  container: z.null().optional(),
  type: z.literal("message"),
  role: z.literal("assistant"),
  model: z.string(),
  content: z.array(AssistantMessageContentSchema),
  stop_reason: z.string().nullable().optional(),
  stop_sequence: z.string().nullable().optional(),
  usage: z
    .object({
      input_tokens: z.number(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
      cache_creation: z
        .object({
          ephemeral_5m_input_tokens: z.number(),
          ephemeral_1h_input_tokens: z.number(),
        })
        .optional(),
      output_tokens: z.number(),
      service_tier: z.string().nullable().optional(),
      inference_geo: z.string().optional(),
      iterations: z.array(z.unknown()).optional(),
      speed: z.string().optional(),
      server_tool_use: z
        .object({
          web_search_requests: z.number().optional(),
          web_fetch_requests: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});
