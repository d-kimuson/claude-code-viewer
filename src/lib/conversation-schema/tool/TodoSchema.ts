import z from "zod";

const TodoSchema = z.object({
  content: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  id: z.string(),
});

export const TodoToolResultSchema = z.union([
  z
    .object({
      oldTodos: z.array(TodoSchema),
      newTodos: z.array(TodoSchema).optional(),
    })
    .strict(),
  z
    .object({
      oldTodos: z.array(TodoSchema).optional(),
      newTodos: z.array(TodoSchema),
    })
    .strict(),
]);
