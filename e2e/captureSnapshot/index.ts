import { TaskExecutor } from "../utils/TaskExecutor";
import { errorPagesCapture } from "./error-pages";
import { homeCapture } from "./home";
import { projectsCapture } from "./projects";
import { sessionDetailCapture } from "./session-detail";

// biome-ignore lint/complexity/useLiteralKeys: env var
const maxConcurrencyEnv = process.env["MAX_CONCURRENCY"];
const executor = new TaskExecutor({
  maxConcurrency:
    maxConcurrencyEnv !== undefined && maxConcurrencyEnv !== ""
      ? parseInt(maxConcurrencyEnv, 10)
      : 10,
});

const tasks = [
  ...homeCapture.tasks,
  ...errorPagesCapture.tasks,
  ...projectsCapture.tasks,
  ...sessionDetailCapture.tasks,
];

executor.setTasks(tasks);

try {
  await executor.execute();
} catch (error) {
  console.error(error);
}
