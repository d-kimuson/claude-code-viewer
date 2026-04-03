import { z } from "zod";
import type { ExtendedConversation } from "../../types/conversation";

export type TaskItem = {
  readonly id: string;
  readonly subject: string;
  readonly description: string | undefined;
  readonly status: "pending" | "in_progress" | "completed";
};

export type TaskStates = {
  readonly stateByToolUseId: ReadonlyMap<string, readonly TaskItem[]>;
  readonly latestTasks: readonly TaskItem[] | null;
};

export const taskCreateInputSchema = z.object({
  subject: z.string(),
  description: z.string().optional(),
});

export const taskUpdateInputSchema = z.object({
  taskId: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
});

const TASK_TOOL_NAMES = new Set(["TaskCreate", "TaskUpdate"]);

export const computeTaskStates = (conversations: readonly ExtendedConversation[]): TaskStates => {
  const stateByToolUseId = new Map<string, readonly TaskItem[]>();
  const tasksById = new Map<string, TaskItem>();
  let nextId = 1;

  for (const conversation of conversations) {
    if (conversation.type === "x-error" || conversation.type !== "assistant") {
      continue;
    }

    const content = conversation.message.content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const item of content) {
      if (typeof item === "string" || item.type !== "tool_use") {
        continue;
      }

      if (!TASK_TOOL_NAMES.has(item.name)) {
        continue;
      }

      if (item.name === "TaskCreate") {
        const parsed = taskCreateInputSchema.safeParse(item.input);
        if (parsed.success) {
          const id = String(nextId);
          nextId += 1;
          const task: TaskItem = {
            id,
            subject: parsed.data.subject,
            description: parsed.data.description,
            status: "pending",
          };
          tasksById.set(id, task);
          stateByToolUseId.set(item.id, [...tasksById.values()]);
        }
      }

      if (item.name === "TaskUpdate") {
        const parsed = taskUpdateInputSchema.safeParse(item.input);
        if (parsed.success) {
          const existing = tasksById.get(parsed.data.taskId);
          if (existing !== undefined) {
            const updated: TaskItem = {
              ...existing,
              ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
              ...(parsed.data.description !== undefined
                ? { description: parsed.data.description }
                : {}),
              ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
            };
            tasksById.set(parsed.data.taskId, updated);
          }
          stateByToolUseId.set(item.id, [...tasksById.values()]);
        }
      }
    }
  }

  const latestTasks = tasksById.size > 0 ? [...tasksById.values()] : null;

  return { stateByToolUseId, latestTasks };
};
