import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "failed",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string().optional(),
  status: TaskStatusSchema,
  owner: z.string().optional(),
  blocks: z.array(z.string()).optional(),
  blockedBy: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  activeForm: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const TaskCreateSchema = z.object({
  subject: z.string(),
  description: z.string().optional(),
  activeForm: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type TaskCreate = z.infer<typeof TaskCreateSchema>;

export const TaskUpdateSchema = z.object({
  turnId: z.string(),
  status: TaskStatusSchema.optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  activeForm: z.string().optional(),
  owner: z.string().optional(),
  addBlockedBy: z.array(z.string()).optional(),
  addBlocks: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;
