import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import { testFileSystemLayer } from "../../../../testing/layers/testFileSystemLayer";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import {
  ProcessPidRepository,
  type ProcessPidsFile,
} from "./ProcessPidRepository";

describe("ProcessPidRepository", () => {
  describe("savePid", () => {
    test("creates a new PID entry when file does not exist", async () => {
      let savedContent = "";

      const FileSystemMock = testFileSystemLayer({
        exists: (path: string) =>
          Effect.succeed(path.includes("mock-claude-code-viewer")),
        makeDirectory: () => Effect.void,
        readFileString: () =>
          Effect.fail(new Error("File not found")).pipe(
            Effect.orElse(() => Effect.succeed("{}")),
          ),
        writeFileString: (_path: string, content: string) =>
          Effect.sync(() => {
            savedContent = content;
          }),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.savePid("session-1", 12345, {
          projectId: "project-1",
          cwd: "/test/cwd",
        });
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.pid).toBe(12345);
      expect(result.sessionProcessId).toBe("session-1");
      expect(result.projectId).toBe("project-1");
      expect(result.cwd).toBe("/test/cwd");
      expect(result.createdAt).toBeDefined();

      const parsedContent = JSON.parse(savedContent) as ProcessPidsFile;
      expect(parsedContent.processes["session-1"]).toBeDefined();
      expect(parsedContent.processes["session-1"]?.pid).toBe(12345);
    });

    test("adds a new PID entry to existing file", async () => {
      const existingData: ProcessPidsFile = {
        processes: {
          "session-1": {
            pid: 11111,
            sessionProcessId: "session-1",
            projectId: "project-1",
            cwd: "/existing/cwd",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        },
      };

      let savedContent = "";

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        readFileString: () => Effect.succeed(JSON.stringify(existingData)),
        writeFileString: (_path: string, content: string) =>
          Effect.sync(() => {
            savedContent = content;
          }),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.savePid("session-2", 22222, {
          projectId: "project-2",
          cwd: "/new/cwd",
        });
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      const parsedContent = JSON.parse(savedContent) as ProcessPidsFile;
      expect(Object.keys(parsedContent.processes)).toHaveLength(2);
      expect(parsedContent.processes["session-1"]).toBeDefined();
      expect(parsedContent.processes["session-2"]).toBeDefined();
      expect(parsedContent.processes["session-2"]?.pid).toBe(22222);
    });

    test("overwrites existing PID entry for same sessionProcessId", async () => {
      const existingData: ProcessPidsFile = {
        processes: {
          "session-1": {
            pid: 11111,
            sessionProcessId: "session-1",
            projectId: "project-1",
            cwd: "/old/cwd",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        },
      };

      let savedContent = "";

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        readFileString: () => Effect.succeed(JSON.stringify(existingData)),
        writeFileString: (_path: string, content: string) =>
          Effect.sync(() => {
            savedContent = content;
          }),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.savePid("session-1", 99999, {
          projectId: "project-1",
          cwd: "/new/cwd",
        });
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      const parsedContent = JSON.parse(savedContent) as ProcessPidsFile;
      expect(Object.keys(parsedContent.processes)).toHaveLength(1);
      expect(parsedContent.processes["session-1"]?.pid).toBe(99999);
      expect(parsedContent.processes["session-1"]?.cwd).toBe("/new/cwd");
    });

    test("recovers from corrupted PID file", async () => {
      let savedContent = "";

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        readFileString: () => Effect.succeed("{ invalid json content }"), // Invalid JSON
        writeFileString: (_path: string, content: string) =>
          Effect.sync(() => {
            savedContent = content;
          }),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.savePid("session-1", 12345, {
          projectId: "project-1",
          cwd: "/test/cwd",
        });
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.pid).toBe(12345);
      const parsedContent = JSON.parse(savedContent) as ProcessPidsFile;
      expect(parsedContent.processes["session-1"]).toBeDefined();
    });
  });

  describe("removePid", () => {
    test("removes an existing PID entry", async () => {
      const existingData: ProcessPidsFile = {
        processes: {
          "session-1": {
            pid: 11111,
            sessionProcessId: "session-1",
            projectId: "project-1",
            cwd: "/test/cwd",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
          "session-2": {
            pid: 22222,
            sessionProcessId: "session-2",
            projectId: "project-2",
            cwd: "/test/cwd2",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        },
      };

      let savedContent = "";

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        readFileString: () => Effect.succeed(JSON.stringify(existingData)),
        writeFileString: (_path: string, content: string) =>
          Effect.sync(() => {
            savedContent = content;
          }),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.removePid("session-1");
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toBeDefined();
      expect(result?.pid).toBe(11111);

      const parsedContent = JSON.parse(savedContent) as ProcessPidsFile;
      expect(Object.keys(parsedContent.processes)).toHaveLength(1);
      expect(parsedContent.processes["session-1"]).toBeUndefined();
      expect(parsedContent.processes["session-2"]).toBeDefined();
    });

    test("returns null when removing non-existent PID", async () => {
      const existingData: ProcessPidsFile = {
        processes: {
          "session-1": {
            pid: 11111,
            sessionProcessId: "session-1",
            projectId: "project-1",
            cwd: "/test/cwd",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        },
      };

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        readFileString: () => Effect.succeed(JSON.stringify(existingData)),
        writeFileString: () => Effect.void,
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.removePid("non-existent");
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toBeNull();
    });
  });

  describe("getPid", () => {
    test("retrieves an existing PID entry", async () => {
      const existingData: ProcessPidsFile = {
        processes: {
          "session-1": {
            pid: 11111,
            sessionProcessId: "session-1",
            projectId: "project-1",
            cwd: "/test/cwd",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        },
      };

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        readFileString: () => Effect.succeed(JSON.stringify(existingData)),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.getPid("session-1");
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toBeDefined();
      expect(result?.pid).toBe(11111);
      expect(result?.sessionProcessId).toBe("session-1");
    });

    test("returns null for non-existent PID", async () => {
      const existingData: ProcessPidsFile = {
        processes: {},
      };

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        readFileString: () => Effect.succeed(JSON.stringify(existingData)),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.getPid("non-existent");
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toBeNull();
    });
  });

  describe("getAllPids", () => {
    test("retrieves all PID entries", async () => {
      const existingData: ProcessPidsFile = {
        processes: {
          "session-1": {
            pid: 11111,
            sessionProcessId: "session-1",
            projectId: "project-1",
            cwd: "/test/cwd1",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
          "session-2": {
            pid: 22222,
            sessionProcessId: "session-2",
            projectId: "project-2",
            cwd: "/test/cwd2",
            createdAt: "2025-01-02T00:00:00.000Z",
          },
        },
      };

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        readFileString: () => Effect.succeed(JSON.stringify(existingData)),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.getAllPids();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toHaveLength(2);
      expect(result.some((p) => p.pid === 11111)).toBe(true);
      expect(result.some((p) => p.pid === 22222)).toBe(true);
    });

    test("returns empty array when no PIDs exist", async () => {
      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(false),
        makeDirectory: () => Effect.void,
        readFileString: () =>
          Effect.fail(new Error("File not found")).pipe(
            Effect.orElse(() => Effect.succeed("{}")),
          ),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        return yield* repo.getAllPids();
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("clearAllPids", () => {
    test("removes all PID entries", async () => {
      let savedContent = "";

      const FileSystemMock = testFileSystemLayer({
        exists: () => Effect.succeed(true),
        makeDirectory: () => Effect.void,
        writeFileString: (_path: string, content: string) =>
          Effect.sync(() => {
            savedContent = content;
          }),
      });

      const program = Effect.gen(function* () {
        const repo = yield* ProcessPidRepository;
        yield* repo.clearAllPids();
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessPidRepository.Live),
          Effect.provide(FileSystemMock),
          Effect.provide(testPlatformLayer()),
        ),
      );

      const parsedContent = JSON.parse(savedContent) as ProcessPidsFile;
      expect(Object.keys(parsedContent.processes)).toHaveLength(0);
    });
  });
});
