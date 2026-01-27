import type {
  Task,
  TaskCreate,
  TaskUpdate,
} from "../../server/core/tasks/schema";
import { honoClient } from "./client";

export const listTasks = async (
  projectId: string,
  sessionId?: string,
): Promise<Task[]> => {
  const response = await honoClient.api.tasks.$get({
    query: { projectId, sessionId },
  });
  return response.json();
};

export const createTask = async (
  projectId: string,
  task: TaskCreate,
  sessionId?: string,
): Promise<Task> => {
  const response = await honoClient.api.tasks.$post({
    query: { projectId, sessionId },
    json: task,
  });
  return response.json();
};

export const updateTask = async (
  projectId: string,
  taskId: string,
  update: Omit<TaskUpdate, "taskId">,
  sessionId?: string,
): Promise<Task> => {
  const response = await honoClient.api.tasks[":id"].$patch({
    param: { id: taskId },
    query: { projectId, sessionId },
    json: update,
  });
  return response.json();
};
