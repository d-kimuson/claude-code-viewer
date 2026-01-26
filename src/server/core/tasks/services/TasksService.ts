/** @effect-diagnostics globalErrorInEffectFailure:skip-file */
import { homedir } from "node:os";
import { join } from "node:path";
import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Option as EffectOption, Layer } from "effect";
import {
  type Task,
  type TaskCreate,
  TaskSchema,
  type TaskUpdate,
} from "../schema";

const TASKS_DIR_NAME = "tasks";
const PROJECTS_DIR_NAME = "projects";
const CLAUDE_DIR_NAME = ".claude";

export class TasksService extends Context.Tag("TasksService")<
  TasksService,
  {
    listTasks: (
      projectPath: string,
      specificSessionId?: string,
    ) => Effect.Effect<Task[], Error>;
    getTask: (
      projectPath: string,
      taskId: string,
      specificSessionId?: string,
    ) => Effect.Effect<Task, Error>;
    createTask: (
      projectPath: string,
      task: TaskCreate,
      specificSessionId?: string,
    ) => Effect.Effect<Task, Error>;
    updateTask: (
      projectPath: string,
      task: TaskUpdate,
      specificSessionId?: string,
    ) => Effect.Effect<Task, Error>;
  }
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      // Helper to find the Global Claude Directory
      const getClaudeDir = () =>
        Effect.succeed(join(homedir(), CLAUDE_DIR_NAME));

      const normalizeProjectPath = (projectPath: string) => {
        // e.g. /Users/foo/bar -> -Users-foo-bar
        const normalized = projectPath.replaceAll(path.sep, "-");
        // Ensure it starts with - if the original path started with /
        return normalized.startsWith("-") ? normalized : `-${normalized}`;
      };

      const resolveProjectUuid = (
        projectPath: string,
        specificSessionId?: string,
      ) =>
        Effect.gen(function* () {
          const claudeDir = yield* getClaudeDir();

          // If a specific session ID is provided, verify it exists and return it
          if (specificSessionId) {
            const sessionTasksDir = path.join(
              claudeDir,
              TASKS_DIR_NAME,
              specificSessionId,
            );
            if (yield* fs.exists(sessionTasksDir)) {
              return specificSessionId;
            }
            // Fallback or fail? Fail seems appropriate if user requested a specific ID
            return yield* Effect.fail(
              new Error(
                `Requested session ${specificSessionId} has no tasks directory`,
              ),
            );
          }

          let projectMetaDir: string;
          // ... rest of auto-resolution logic ...

          // Check if the projectPath is already pointing to a metadata directory in .claude/projects
          // Path structure: .../.claude/projects/<normalized-id>
          const isMetadataPath =
            projectPath.includes(join(CLAUDE_DIR_NAME, PROJECTS_DIR_NAME)) &&
            projectPath.split(path.sep).pop()?.startsWith("-");

          if (isMetadataPath && (yield* fs.exists(projectPath))) {
            projectMetaDir = projectPath;
          } else {
            const identifier = normalizeProjectPath(projectPath);
            projectMetaDir = path.join(
              claudeDir,
              PROJECTS_DIR_NAME,
              identifier,
            );
          }

          return yield* Effect.gen(function* () {
            // Check if directory exists
            const exists = yield* fs.exists(projectMetaDir);
            if (!exists) {
              return yield* Effect.fail(
                new Error(
                  `Project metadata directory not found: ${projectMetaDir}`,
                ),
              );
            }

            // Read directory to find all UUID-like files (json, jsonl, or no extension)
            const files = yield* fs.readDirectory(projectMetaDir);

            const uuidPattern =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

            const candidates = files.filter((f) => uuidPattern.test(f));

            if (candidates.length === 0) {
              return yield* Effect.fail(
                new Error(`No UUID file found in: ${projectMetaDir}`),
              );
            }

            // Analyze candidates: valid UUID, mtime, and whether they have a tasks directory
            const candidateInfo = yield* Effect.all(
              candidates.map((file) =>
                Effect.gen(function* () {
                  const fullPath = path.join(projectMetaDir, file);
                  const stat = yield* fs.stat(fullPath);
                  const match = file.match(uuidPattern);
                  const uuid = match ? match[0] : file;

                  const tasksPath = path.join(claudeDir, TASKS_DIR_NAME, uuid);
                  const hasTasks = yield* fs.exists(tasksPath);

                  return {
                    file,
                    uuid,
                    mtime: EffectOption.getOrElse(
                      stat.mtime,
                      () => new Date(0),
                    ),
                    hasTasks,
                  };
                }),
              ),
              { concurrency: "unbounded" },
            );

            // Sort logic:
            // 1. Has tasks directory (Priority #1)
            // 2. Newer mtime (Priority #2)
            const sorted = candidateInfo.sort((a, b) => {
              if (a.hasTasks && !b.hasTasks) return -1;
              if (!a.hasTasks && b.hasTasks) return 1;
              return b.mtime.getTime() - a.mtime.getTime();
            });

            const best = sorted[0];

            if (!best) {
              return yield* Effect.fail(
                new Error(
                  "Unexpected error: No project candidate available after filtering",
                ),
              );
            }

            return best.uuid;
          });
        });

      const getTasksDir = (projectPath: string, specificSessionId?: string) =>
        Effect.gen(function* () {
          const claudeDir = yield* getClaudeDir();
          const uuid = yield* resolveProjectUuid(
            projectPath,
            specificSessionId,
          );
          const tasksDir = path.join(claudeDir, TASKS_DIR_NAME, uuid);
          return tasksDir;
        });

      const listTasks = (projectPath: string, specificSessionId?: string) =>
        Effect.gen(function* () {
          const tasksDir = yield* getTasksDir(projectPath, specificSessionId);

          if (!tasksDir) {
            return [];
          }

          const exists = yield* fs.exists(tasksDir);
          if (!exists) {
            return [];
          }

          const files = yield* fs.readDirectory(tasksDir);
          const tasks: Task[] = [];

          for (const file of files) {
            if (!file.endsWith(".json")) continue;
            const content = yield* fs.readFileString(path.join(tasksDir, file));
            try {
              const task = JSON.parse(content);
              // Validate with schema optionally, or just cast
              const parsed = TaskSchema.safeParse(task);
              if (parsed.success) {
                tasks.push(parsed.data);
              } else {
                console.warn(`Invalid task file ${file}:`, parsed.error);
                // Debugging: Push invalid tasks so we can see them
                tasks.push({
                  id: task.id || file.replace(".json", ""),
                  subject: task.subject || task.title || "Invalid Task Schema",
                  description: `Validation Error: ${JSON.stringify(parsed.error.format())}. Raw: ${JSON.stringify(task)}`,
                  status: task.status || "failed",
                  blocks: [],
                  blockedBy: [],
                } as unknown as Task);
              }
            } catch (e) {
              console.error(`Failed to parse task file ${file}`, e);
              tasks.push({
                id: file.replace(".json", ""),
                subject: "Corrupted Task File",
                description: String(e),
                status: "failed",
                blocks: [],
                blockedBy: [],
              } as unknown as Task);
            }
          }

          return tasks.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
        });

      const getTask = (
        projectPath: string,
        taskId: string,
        specificSessionId?: string,
      ) =>
        Effect.gen(function* () {
          const tasksDir = yield* getTasksDir(projectPath, specificSessionId);
          const taskFile = path.join(tasksDir, `${taskId}.json`);

          const exists = yield* fs.exists(taskFile);
          if (!exists) {
            return yield* Effect.fail(new Error(`Task ${taskId} not found`));
          }

          const content = yield* fs.readFileString(taskFile);
          const task = JSON.parse(content);
          return yield* Effect.try(() => TaskSchema.parse(task));
        });

      const createTask = (
        projectPath: string,
        taskDef: TaskCreate,
        specificSessionId?: string,
      ) =>
        Effect.gen(function* () {
          const tasksDir = yield* getTasksDir(projectPath, specificSessionId);
          // Ensure directory exists
          const dirExists = yield* fs.exists(tasksDir);
          if (!dirExists) {
            yield* fs.makeDirectory(tasksDir, { recursive: true });
          }

          // Generate ID: find max ID and increment
          const files = yield* fs.readDirectory(tasksDir);
          let maxId = 0;
          for (const file of files) {
            if (file.endsWith(".json")) {
              const idPart = file.replace(".json", "");
              const idNum = parseInt(idPart, 10);
              if (!Number.isNaN(idNum) && idNum > maxId) {
                maxId = idNum;
              }
            }
          }
          const newId = (maxId + 1).toString();

          const newTask: Task = {
            id: newId,
            status: "pending",
            blocks: [],
            blockedBy: [],
            ...taskDef,
          };

          const filePath = path.join(tasksDir, `${newId}.json`);
          yield* fs.writeFileString(filePath, JSON.stringify(newTask, null, 2));

          return newTask;
        });

      const updateTask = (
        projectPath: string,
        update: TaskUpdate,
        specificSessionId?: string,
      ) =>
        Effect.gen(function* () {
          const tasksDir = yield* getTasksDir(projectPath, specificSessionId);
          const filePath = path.join(tasksDir, `${update.taskId}.json`);

          const exists = yield* fs.exists(filePath);
          if (!exists) {
            return yield* Effect.fail(
              new Error(`Task ${update.taskId} not found`),
            );
          }

          const content = yield* fs.readFileString(filePath);
          const currentTask = TaskSchema.parse(JSON.parse(content));

          const updatedTask: Task = {
            ...currentTask,
            // User cannot update status via Viewer, it is managed by Claude Agent
            status: currentTask.status,
            subject: update.subject ?? currentTask.subject,
            description: update.description ?? currentTask.description,
            activeForm: update.activeForm ?? currentTask.activeForm,
            owner: update.owner ?? currentTask.owner,
            blockedBy: update.addBlockedBy
              ? [...(currentTask.blockedBy || []), ...update.addBlockedBy]
              : currentTask.blockedBy,
            blocks: update.addBlocks
              ? [...(currentTask.blocks || []), ...update.addBlocks]
              : currentTask.blocks,
            metadata: update.metadata
              ? { ...currentTask.metadata, ...update.metadata }
              : currentTask.metadata,
          };

          // Remove null metadata keys
          if (updatedTask.metadata) {
            for (const key in updatedTask.metadata) {
              if (updatedTask.metadata[key] === null) {
                delete updatedTask.metadata[key];
              }
            }
          }

          yield* fs.writeFileString(
            filePath,
            JSON.stringify(updatedTask, null, 2),
          );
          return updatedTask;
        });

      return {
        listTasks,
        getTask,
        createTask,
        updateTask,
      };
    }),
  );
}
