import { z } from "zod";
import { StructuredPatchSchema } from "./StructuredPatchSchema";

export const CommonToolResultSchema = z.union([
  z.object({
    stdout: z.string(),
    stderr: z.string(),
    interrupted: z.boolean(),
    isImage: z.boolean(),
  }),

  // create
  z.object({
    type: z.literal("create"),
    filePath: z.string(),
    content: z.string(),
    structuredPatch: z.array(StructuredPatchSchema),
  }),

  // update
  z.object({
    filePath: z.string(),
    oldString: z.string(),
    newString: z.string(),
    originalFile: z.string(),
    userModified: z.boolean(),
    replaceAll: z.boolean(),
    structuredPatch: z.array(StructuredPatchSchema),
  }),

  // search?
  z.object({
    filenames: z.array(z.string()),
    durationMs: z.number(),
    numFiles: z.number(),
    truncated: z.boolean(),
  }),

  // text
  z.object({
    type: z.literal("text"),
    file: z.object({
      filePath: z.string(),
      content: z.string(),
      numLines: z.number(),
      startLine: z.number(),
      totalLines: z.number(),
    }),
  }),

  // content
  z.object({
    mode: z.literal("content"),
    numFiles: z.number(),
    filenames: z.array(z.string()),
    content: z.string(),
    numLines: z.number(),
  }),
]);
