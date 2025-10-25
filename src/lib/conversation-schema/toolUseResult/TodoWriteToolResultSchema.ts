import { z } from "zod";

export const TodoItemSchema = z.object({
  content: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]),
  activeForm: z.string(),
});

export const TodoWriteToolResultSchema = z.object({
  oldTodos: z.array(TodoItemSchema),
  newTodos: z.array(TodoItemSchema),
});

export type TodoItem = z.infer<typeof TodoItemSchema>;
export type TodoWriteToolResult = z.infer<typeof TodoWriteToolResultSchema>;
