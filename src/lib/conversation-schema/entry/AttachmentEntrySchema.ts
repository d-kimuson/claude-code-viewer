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

export const AttachmentEntrySchema = z.union([
  DeferredToolsDeltaSchema,
  McpInstructionsDeltaSchema,
]);

export type AttachmentEntry = z.infer<typeof AttachmentEntrySchema>;
