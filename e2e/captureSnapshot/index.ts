import { TaskExecutor } from "../utils/TaskExecutor";
import { errorPagesCapture } from "./error-pages";
import { homeCapture } from "./home";
import { projectDetailCapture } from "./project-detail";
import { projectsCapture } from "./projects";
import { sessionDetailCapture } from "./session-detail";

const executor = new TaskExecutor({
  // biome-ignore lint/complexity/useLiteralKeys: env var
  maxConcurrency: process.env["MAX_CONCURRENCY"]
    ? // biome-ignore lint/complexity/useLiteralKeys: env var
      parseInt(process.env["MAX_CONCURRENCY"], 10)
    : 10,
});

const tasks = [
  ...homeCapture.tasks,
  ...errorPagesCapture.tasks,
  ...projectsCapture.tasks,
  ...projectDetailCapture.tasks,
  ...sessionDetailCapture.tasks,
];

executor.setTasks(tasks);

try {
  await executor.execute();
} catch (error) {
  console.error(error);
}
