import { Path } from "@effect/platform";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { describe, expect } from "vitest";
import {
  createFileInfo,
  testFileSystemLayer,
} from "../../../../testing/layers/testFileSystemLayer.ts";
import { ApplicationContext } from "../../platform/services/ApplicationContext.ts";
import { TasksService } from "./TasksService.ts";

/**
 * Test layer that provides Path service
 */
const testPathLayer = Path.layer;

/**
 * Helper to get claude directory path for tests
 */
const getClaudeDir = () => "/test-home/.claude";

const testApplicationContextLayer = Layer.succeed(ApplicationContext, {
  claudeCodePaths: Effect.succeed({
    globalClaudeDirectoryPath: getClaudeDir(),
    claudeCommandsDirPath: `${getClaudeDir()}/commands`,
    claudeSkillsDirPath: `${getClaudeDir()}/skills`,
    claudeProjectsDirPath: `${getClaudeDir()}/projects`,
  }),
});

describe("TasksService", () => {
  describe("listTasks", () => {
    it.live("returns empty array when project metadata directory does not exist", () =>
      Effect.gen(function* () {
        const tasksService = yield* TasksService;
        const result = yield* tasksService.listTasks("/non/existent/project");

        expect(result).toEqual([]);
      }).pipe(
        Effect.provide(TasksService.Live),
        Effect.provide(
          testFileSystemLayer({
            exists: () => Effect.succeed(false),
          }),
        ),
        Effect.provide(testPathLayer),
        Effect.provide(testApplicationContextLayer),
      ),
    );

    it.live("returns empty array when no UUID file found in project metadata directory", () => {
      const claudeDir = getClaudeDir();
      const projectMetaDir = `${claudeDir}/projects/-test-project`;

      return Effect.gen(function* () {
        const tasksService = yield* TasksService;
        const result = yield* tasksService.listTasks("/test/project");

        expect(result).toEqual([]);
      }).pipe(
        Effect.provide(TasksService.Live),
        Effect.provide(
          testFileSystemLayer({
            exists: (path) => Effect.succeed(path === projectMetaDir),
            readDirectory: () => Effect.succeed([]), // No UUID files
          }),
        ),
        Effect.provide(testPathLayer),
        Effect.provide(testApplicationContextLayer),
      );
    });

    it.live("returns empty array when specific sessionId tasks directory does not exist", () =>
      Effect.gen(function* () {
        const tasksService = yield* TasksService;
        const result = yield* tasksService.listTasks("/test/project", "non-existent-session-id");

        expect(result).toEqual([]);
      }).pipe(
        Effect.provide(TasksService.Live),
        Effect.provide(
          testFileSystemLayer({
            exists: () => Effect.succeed(false), // Session tasks dir does not exist
          }),
        ),
        Effect.provide(testPathLayer),
        Effect.provide(testApplicationContextLayer),
      ),
    );

    it.live("returns empty array when tasks directory does not exist for resolved UUID", () => {
      const uuid = "12345678-1234-1234-1234-123456789abc";
      const claudeDir = getClaudeDir();
      const projectMetaDir = `${claudeDir}/projects/-test-project`;
      const tasksDir = `${claudeDir}/tasks/${uuid}`;

      // Track which paths exist
      const existsMap = new Map<string, boolean>([
        [projectMetaDir, true],
        [tasksDir, false], // Tasks dir does not exist
      ]);

      return Effect.gen(function* () {
        const tasksService = yield* TasksService;
        const result = yield* tasksService.listTasks("/test/project");

        expect(result).toEqual([]);
      }).pipe(
        Effect.provide(TasksService.Live),
        Effect.provide(
          testFileSystemLayer({
            exists: (path) => Effect.succeed(existsMap.get(path) ?? false),
            readDirectory: (path) => {
              if (path === projectMetaDir) {
                return Effect.succeed([`${uuid}.json`]);
              }
              return Effect.succeed([]);
            },
            stat: () => Effect.succeed(createFileInfo({})),
          }),
        ),
        Effect.provide(testPathLayer),
        Effect.provide(testApplicationContextLayer),
      );
    });

    it.live("returns tasks when tasks directory exists and contains valid task files", () => {
      const uuid = "12345678-1234-1234-1234-123456789abc";
      const claudeDir = getClaudeDir();
      const projectMetaDir = `${claudeDir}/projects/-test-project`;
      const tasksDir = `${claudeDir}/tasks/${uuid}`;

      const existsMap = new Map<string, boolean>([
        [projectMetaDir, true],
        [tasksDir, true],
      ]);

      const taskData = {
        id: "1",
        subject: "Test task",
        description: "Test description",
        status: "pending",
        blocks: [],
        blockedBy: [],
      };

      return Effect.gen(function* () {
        const tasksService = yield* TasksService;
        const result = yield* tasksService.listTasks("/test/project");

        expect(result).toHaveLength(1);
        expect(result[0]?.subject).toBe("Test task");
      }).pipe(
        Effect.provide(TasksService.Live),
        Effect.provide(
          testFileSystemLayer({
            exists: (path) => Effect.succeed(existsMap.get(path) ?? false),
            readDirectory: (path) => {
              if (path === projectMetaDir) {
                return Effect.succeed([`${uuid}.json`]);
              }
              if (path === tasksDir) {
                return Effect.succeed(["1.json"]);
              }
              return Effect.succeed([]);
            },
            stat: () => Effect.succeed(createFileInfo({})),
            readFileString: () => Effect.succeed(JSON.stringify(taskData)),
          }),
        ),
        Effect.provide(testPathLayer),
        Effect.provide(testApplicationContextLayer),
      );
    });
  });

  describe("getTask", () => {
    it.live("fails when project metadata directory does not exist", () =>
      Effect.gen(function* () {
        const tasksService = yield* TasksService;
        const result = yield* Effect.either(tasksService.getTask("/non/existent/project", "1"));

        expect(result._tag).toBe("Left");
      }).pipe(
        Effect.provide(TasksService.Live),
        Effect.provide(
          testFileSystemLayer({
            exists: () => Effect.succeed(false),
          }),
        ),
        Effect.provide(testPathLayer),
        Effect.provide(testApplicationContextLayer),
      ),
    );

    it.live("fails when task file does not exist", () => {
      const uuid = "12345678-1234-1234-1234-123456789abc";
      const claudeDir = getClaudeDir();
      const projectMetaDir = `${claudeDir}/projects/-test-project`;
      const tasksDir = `${claudeDir}/tasks/${uuid}`;

      const existsMap = new Map<string, boolean>([
        [projectMetaDir, true],
        [tasksDir, true],
        [`${tasksDir}/1.json`, false],
      ]);

      return Effect.gen(function* () {
        const tasksService = yield* TasksService;
        const result = yield* Effect.either(tasksService.getTask("/test/project", "1"));

        expect(result._tag).toBe("Left");
      }).pipe(
        Effect.provide(TasksService.Live),
        Effect.provide(
          testFileSystemLayer({
            exists: (path) => Effect.succeed(existsMap.get(path) ?? false),
            readDirectory: (path) => {
              if (path === projectMetaDir) {
                return Effect.succeed([`${uuid}.json`]);
              }
              return Effect.succeed([]);
            },
            stat: () => Effect.succeed(createFileInfo({})),
          }),
        ),
        Effect.provide(testPathLayer),
        Effect.provide(testApplicationContextLayer),
      );
    });
  });

  describe("createTask", () => {
    it.live("creates directory and task when directory does not exist", () => {
      const uuid = "12345678-1234-1234-1234-123456789abc";
      const claudeDir = getClaudeDir();
      const projectMetaDir = `${claudeDir}/projects/-test-project`;
      const tasksDir = `${claudeDir}/tasks/${uuid}`;

      let directoryCreated = false;

      const existsMap = new Map<string, boolean>([
        [projectMetaDir, true],
        [tasksDir, false], // Tasks dir does not exist initially
      ]);

      return Effect.gen(function* () {
        const tasksService = yield* TasksService;
        const result = yield* tasksService.createTask("/test/project", {
          subject: "New task",
          description: "New description",
        });

        expect(directoryCreated).toBe(true);
        expect(result.subject).toBe("New task");
        expect(result.id).toBe("1");
      }).pipe(
        Effect.provide(TasksService.Live),
        Effect.provide(
          testFileSystemLayer({
            exists: (path) => Effect.succeed(existsMap.get(path) ?? false),
            readDirectory: (path) => {
              if (path === projectMetaDir) {
                return Effect.succeed([`${uuid}.json`]);
              }
              // Empty tasks directory after creation
              return Effect.succeed([]);
            },
            stat: () => Effect.succeed(createFileInfo({})),
            makeDirectory: () => {
              directoryCreated = true;
              return Effect.void;
            },
            writeFileString: () => Effect.void,
          }),
        ),
        Effect.provide(testPathLayer),
        Effect.provide(testApplicationContextLayer),
      );
    });
  });

  describe("updateTask", () => {
    it.live("fails when project metadata directory does not exist", () =>
      Effect.gen(function* () {
        const tasksService = yield* TasksService;
        const result = yield* Effect.either(
          tasksService.updateTask("/non/existent/project", {
            taskId: "1",
            subject: "Updated",
          }),
        );

        expect(result._tag).toBe("Left");
      }).pipe(
        Effect.provide(TasksService.Live),
        Effect.provide(
          testFileSystemLayer({
            exists: () => Effect.succeed(false),
          }),
        ),
        Effect.provide(testPathLayer),
        Effect.provide(testApplicationContextLayer),
      ),
    );
  });
});
