import { Context, Effect, Layer } from "effect";
import type { TaskCreate, TaskUpdate } from "../schema";
import { TasksService } from "../services/TasksService";

const make = Effect.gen(function* () {
  const service = yield* TasksService;

  const listTasks = (projectPath: string, specificSessionId?: string) =>
    service.listTasks(projectPath, specificSessionId);

  const createTask = (
    projectPath: string,
    task: TaskCreate,
    specificSessionId?: string,
  ) => service.createTask(projectPath, task, specificSessionId);

  const updateTask = (
    projectPath: string,
    task: TaskUpdate,
    specificSessionId?: string,
  ) => service.updateTask(projectPath, task, specificSessionId);

  return {
    listTasks,
    createTask,
    updateTask,
  };
});

export class TasksController extends Context.Tag("TasksController")<
  TasksController,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.effect(this, make);
}
