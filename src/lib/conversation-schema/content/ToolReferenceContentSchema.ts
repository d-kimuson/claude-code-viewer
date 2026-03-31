import { z } from "zod";

export const ToolReferenceContentSchema = z.object({
  type: z.literal("tool_reference"),
  tool_name: z.string(),
});
