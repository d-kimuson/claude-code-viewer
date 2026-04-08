import { z } from "zod";
import { BaseEntrySchema } from "./BaseEntrySchema.ts";

const AttachmentBaseEntrySchema = BaseEntrySchema.extend({
  type: z.literal("attachment"),
  entrypoint: z.string().optional(),
  slug: z.string().optional(),
});

const DeferredToolsDeltaSchema = AttachmentBaseEntrySchema.extend({
  attachment: z.object({
    type: z.literal("deferred_tools_delta"),
    addedNames: z.array(z.string()),
    addedLines: z.array(z.string()),
    removedNames: z.array(z.string()),
  }),
});

const McpInstructionsDeltaSchema = AttachmentBaseEntrySchema.extend({
  attachment: z.object({
    type: z.literal("mcp_instructions_delta"),
    addedNames: z.array(z.string()),
    addedBlocks: z.array(z.string()),
    removedNames: z.array(z.string()),
  }),
});

const CompanionIntroSchema = AttachmentBaseEntrySchema.extend({
  attachment: z.object({
    type: z.literal("companion_intro"),
    name: z.string(),
    species: z.string(),
  }),
});

/**
 * Fallback for unknown attachment types to avoid crashes on new Claude Code versions.
 */
const UnknownAttachmentSchema = AttachmentBaseEntrySchema.extend({
  attachment: z.object({ type: z.string() }).loose(),
});

export const AttachmentEntrySchema = z.union([
  DeferredToolsDeltaSchema,
  McpInstructionsDeltaSchema,
  CompanionIntroSchema,
  UnknownAttachmentSchema,
]);

export type AttachmentEntry = z.infer<typeof AttachmentEntrySchema>;
