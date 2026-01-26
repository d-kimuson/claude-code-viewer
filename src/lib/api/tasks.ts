import type {
  Task,
  TaskCreate,
  TaskUpdate,
} from "../../server/core/tasks/schema";

const getBaseUrl = () => "/api/tasks";

export const listTasks = async (
  projectId: string,
  sessionId?: string,
): Promise<Task[]> => {
  const url = new URL(getBaseUrl(), window.location.origin);
  url.searchParams.set("projectId", projectId);
  if (sessionId) url.searchParams.set("sessionId", sessionId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Failed to list tasks");
  }
  return response.json();
};

export const createTask = async (
  projectId: string,
  task: TaskCreate,
  sessionId?: string,
): Promise<Task> => {
  const url = new URL(getBaseUrl(), window.location.origin);
  url.searchParams.set("projectId", projectId);
  if (sessionId) url.searchParams.set("sessionId", sessionId);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });
  if (!response.ok) {
    throw new Error("Failed to create task");
  }
  return response.json();
};

export const updateTask = async (
  projectId: string,
  taskId: string,
  update: Partial<TaskUpdate>,
  sessionId?: string,
): Promise<Task> => {
  const url = new URL(`${getBaseUrl()}/${taskId}`, window.location.origin);
  url.searchParams.set("projectId", projectId);
  if (sessionId) url.searchParams.set("sessionId", sessionId);

  const response = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(update),
  });
  if (!response.ok) {
    throw new Error("Failed to update task");
  }
  return response.json();
};
