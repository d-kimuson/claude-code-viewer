import { z } from "zod";
import { CommonToolResultSchema } from "./CommonToolSchema.ts";
import { TodoToolResultSchema } from "./TodoSchema.ts";

export const ToolUseResultSchema = z.union([
  z.string(),
  TodoToolResultSchema,
  CommonToolResultSchema,
]);
