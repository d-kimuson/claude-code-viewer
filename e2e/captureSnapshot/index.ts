import { homeCapture } from "./home";
import { errorPagesCapture } from "./error-pages";
import { projectsCapture } from "./projects";
import { projectDetailCapture } from "./project-detail";
import { sessionDetailCapture } from "./session-detail";
import { TaskExecutor } from "../utils/TaskExecutor";

const executor = new TaskExecutor({
  maxConcurrency: process.env['MAX_CONCURRENCY'] ? parseInt(process.env['MAX_CONCURRENCY']) : 10,
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
