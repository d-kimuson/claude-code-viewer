import { z } from "zod";
import { CommonToolResultSchema } from "./CommonToolSchema";
import { TodoToolResultSchema } from "./TodoSchema";

export const ToolUseResultSchema = z.union([
  z.string(),
  TodoToolResultSchema,
  CommonToolResultSchema,
]);
