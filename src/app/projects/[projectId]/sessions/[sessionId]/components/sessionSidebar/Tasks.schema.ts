import { z } from "zod";

export const createTaskFormSchema = z.object({
  subject: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  activeForm: z.string().optional(),
});

export type CreateTaskForm = z.infer<typeof createTaskFormSchema>;
