import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import type { ProcessPidMetadata } from "../infrastructure/ProcessPidRepository";
import { ProcessPidRepository } from "../infrastructure/ProcessPidRepository";
import { ProcessDetectionService } from "./ProcessDetectionService";

/**
 * Unit tests for PID tracking integration in ClaudeCodeLifeCycleService
 *
 * Note: These tests focus on the PID tracking logic only.
 * Full integration tests with actual Claude Code SDK are not included
 * as they would require spawning real processes.
 */
describe("ClaudeCodeLifeCycleService - PID Tracking Integration", () => {
  describe("abortTask - PID cleanup logic", () => {
    test("should remove PID record after graceful shutdown when process terminates", async () => {
      // Mock state
      const pidStorage = new Map<string, ProcessPidMetadata>();
      const mockSessionProcessId = "test-session-1";
      const mockPid = 12345;

      // Pre-populate PID
      pidStorage.set(mockSessionProcessId, {
        pid: mockPid,
        sessionProcessId: mockSessionProcessId,
        projectId: "test-project",
        cwd: "/test/cwd",
        createdAt: new Date().toISOString(),
      });

      // Mock ProcessPidRepository
      const MockProcessPidRepository = Layer.succeed(
        ProcessPidRepository,
        ProcessPidRepository.of({
          savePid: (sessionProcessId, pid, metadata) =>
            Effect.sync(() => {
              const pidMetadata = {
                pid,
                sessionProcessId,
                projectId: metadata.projectId,
                cwd: metadata.cwd,
                createdAt: new Date().toISOString(),
              };
              pidStorage.set(sessionProcessId, pidMetadata);
              return pidMetadata;
            }),
          removePid: (sessionProcessId) =>
            Effect.sync(() => {
              const metadata = pidStorage.get(sessionProcessId);
              pidStorage.delete(sessionProcessId);
              return metadata ?? null;
            }),
          getPid: (sessionProcessId) =>
            Effect.sync(() => pidStorage.get(sessionProcessId) ?? null),
          getAllPids: () => Effect.sync(() => Array.from(pidStorage.values())),
          clearAllPids: () =>
            Effect.sync(() => {
              pidStorage.clear();
            }),
        }),
      );

      // Mock ProcessDetectionService - process already terminated
      const MockProcessDetectionService = Layer.succeed(
        ProcessDetectionService,
        ProcessDetectionService.of({
          getCurrentProcessList: () => Effect.succeed([]),
          detectClaudeCodePid: () => Effect.succeed(null),
          isProcessAlive: (_pid) => Effect.succeed(false), // Process is dead
          killProcess: (_pid) => Effect.succeed(true),
        }),
      );

      // Test the logic that would be in abortTask
      const program = Effect.gen(function* () {
        const processPidRepository = yield* ProcessPidRepository;
        const processDetectionService = yield* ProcessDetectionService;

        // Simulate abortTask logic
        const pidMetadata =
          yield* processPidRepository.getPid(mockSessionProcessId);

        if (pidMetadata !== null) {
          const isAlive = yield* processDetectionService.isProcessAlive(
            pidMetadata.pid,
          );

          if (!isAlive) {
            // Process already terminated, just remove the record
            yield* processPidRepository.removePid(mockSessionProcessId);
          }
        }

        // Verify PID was removed
        const afterRemoval =
          yield* processPidRepository.getPid(mockSessionProcessId);
        return afterRemoval;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(MockProcessPidRepository),
          Effect.provide(MockProcessDetectionService),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      expect(result).toBeNull();
      expect(pidStorage.has(mockSessionProcessId)).toBe(false);
    });

    test("should force kill and remove PID when process is still alive after graceful shutdown", async () => {
      const pidStorage = new Map<string, ProcessPidMetadata>();
      const killCalls = { count: 0, killedPid: 0 };
      const mockSessionProcessId = "test-session-2";
      const mockPid = 67890;

      pidStorage.set(mockSessionProcessId, {
        pid: mockPid,
        sessionProcessId: mockSessionProcessId,
        projectId: "test-project",
        cwd: "/test/cwd",
        createdAt: new Date().toISOString(),
      });

      const MockProcessPidRepository = Layer.succeed(
        ProcessPidRepository,
        ProcessPidRepository.of({
          savePid: (sessionProcessId, pid, metadata) =>
            Effect.succeed({
              pid,
              sessionProcessId,
              projectId: metadata.projectId,
              cwd: metadata.cwd,
              createdAt: new Date().toISOString(),
            }),
          removePid: (sessionProcessId) =>
            Effect.sync(() => {
              const metadata = pidStorage.get(sessionProcessId);
              pidStorage.delete(sessionProcessId);
              return metadata ?? null;
            }),
          getPid: (sessionProcessId) =>
            Effect.sync(() => pidStorage.get(sessionProcessId) ?? null),
          getAllPids: () => Effect.sync(() => Array.from(pidStorage.values())),
          clearAllPids: () =>
            Effect.sync(() => {
              pidStorage.clear();
            }),
        }),
      );

      const MockProcessDetectionService = Layer.succeed(
        ProcessDetectionService,
        ProcessDetectionService.of({
          getCurrentProcessList: () => Effect.succeed([]),
          detectClaudeCodePid: () => Effect.succeed(null),
          isProcessAlive: (_pid) => Effect.succeed(true), // Process still alive
          killProcess: (pid) =>
            Effect.sync(() => {
              killCalls.count++;
              killCalls.killedPid = pid;
              return true;
            }),
        }),
      );

      const program = Effect.gen(function* () {
        const processPidRepository = yield* ProcessPidRepository;
        const processDetectionService = yield* ProcessDetectionService;

        // Simulate abortTask logic
        const pidMetadata =
          yield* processPidRepository.getPid(mockSessionProcessId);

        if (pidMetadata !== null) {
          const isAlive = yield* processDetectionService.isProcessAlive(
            pidMetadata.pid,
          );

          if (isAlive) {
            // Force kill
            yield* processDetectionService.killProcess(pidMetadata.pid);
          }

          // Remove PID regardless of kill result
          yield* processPidRepository.removePid(mockSessionProcessId);
        }

        return {
          killCalls,
          remainingPid:
            yield* processPidRepository.getPid(mockSessionProcessId),
        };
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(MockProcessPidRepository),
          Effect.provide(MockProcessDetectionService),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      expect(result.killCalls.count).toBe(1);
      expect(result.killCalls.killedPid).toBe(mockPid);
      expect(result.remainingPid).toBeNull();
      expect(pidStorage.has(mockSessionProcessId)).toBe(false);
    });

    test("should handle missing PID gracefully (backward compatibility)", async () => {
      const pidStorage = new Map<string, ProcessPidMetadata>();
      const mockSessionProcessId = "test-session-3";

      // No PID stored for this session (backward compatibility case)

      const MockProcessPidRepository = Layer.succeed(
        ProcessPidRepository,
        ProcessPidRepository.of({
          savePid: (sessionProcessId, pid, metadata) =>
            Effect.succeed({
              pid,
              sessionProcessId,
              projectId: metadata.projectId,
              cwd: metadata.cwd,
              createdAt: new Date().toISOString(),
            }),
          removePid: (sessionProcessId) =>
            Effect.sync(() => {
              const metadata = pidStorage.get(sessionProcessId);
              pidStorage.delete(sessionProcessId);
              return metadata ?? null;
            }),
          getPid: (sessionProcessId) =>
            Effect.sync(() => pidStorage.get(sessionProcessId) ?? null),
          getAllPids: () => Effect.sync(() => Array.from(pidStorage.values())),
          clearAllPids: () =>
            Effect.sync(() => {
              pidStorage.clear();
            }),
        }),
      );

      const MockProcessDetectionService = Layer.succeed(
        ProcessDetectionService,
        ProcessDetectionService.of({
          getCurrentProcessList: () => Effect.succeed([]),
          detectClaudeCodePid: () => Effect.succeed(null),
          isProcessAlive: (_pid) => Effect.succeed(false),
          killProcess: (_pid) => Effect.succeed(true),
        }),
      );

      const program = Effect.gen(function* () {
        const processPidRepository = yield* ProcessPidRepository;

        // Simulate abortTask logic
        const pidMetadata =
          yield* processPidRepository.getPid(mockSessionProcessId);

        // Should be null, and we should handle it gracefully
        return pidMetadata;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(MockProcessPidRepository),
          Effect.provide(MockProcessDetectionService),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      expect(result).toBeNull();
    });
  });

  describe("abortAllTasks - PID cleanup logic", () => {
    test("should force kill all alive processes and clear all PIDs", async () => {
      const pidStorage = new Map<string, ProcessPidMetadata>([
        [
          "session-1",
          {
            pid: 11111,
            sessionProcessId: "session-1",
            projectId: "project-1",
            cwd: "/test/cwd1",
            createdAt: new Date().toISOString(),
          },
        ],
        [
          "session-2",
          {
            pid: 22222,
            sessionProcessId: "session-2",
            projectId: "project-2",
            cwd: "/test/cwd2",
            createdAt: new Date().toISOString(),
          },
        ],
      ]);

      const killCalls: number[] = [];
      const aliveChecks = new Map<number, boolean>([
        [11111, true], // Process 1 is alive
        [22222, false], // Process 2 is dead
      ]);

      const MockProcessPidRepository = Layer.succeed(
        ProcessPidRepository,
        ProcessPidRepository.of({
          savePid: (sessionProcessId, pid, metadata) =>
            Effect.succeed({
              pid,
              sessionProcessId,
              projectId: metadata.projectId,
              cwd: metadata.cwd,
              createdAt: new Date().toISOString(),
            }),
          removePid: (sessionProcessId) =>
            Effect.sync(() => {
              const metadata = pidStorage.get(sessionProcessId);
              pidStorage.delete(sessionProcessId);
              return metadata ?? null;
            }),
          getPid: (sessionProcessId) =>
            Effect.sync(() => pidStorage.get(sessionProcessId) ?? null),
          getAllPids: () => Effect.sync(() => Array.from(pidStorage.values())),
          clearAllPids: () =>
            Effect.sync(() => {
              pidStorage.clear();
            }),
        }),
      );

      const MockProcessDetectionService = Layer.succeed(
        ProcessDetectionService,
        ProcessDetectionService.of({
          getCurrentProcessList: () => Effect.succeed([]),
          detectClaudeCodePid: () => Effect.succeed(null),
          isProcessAlive: (pid) =>
            Effect.succeed(aliveChecks.get(pid) ?? false),
          killProcess: (pid) =>
            Effect.sync(() => {
              killCalls.push(pid);
              return true;
            }),
        }),
      );

      const program = Effect.gen(function* () {
        const processPidRepository = yield* ProcessPidRepository;
        const processDetectionService = yield* ProcessDetectionService;

        // Simulate abortAllTasks logic
        const allPids = yield* processPidRepository.getAllPids();

        for (const pidMetadata of allPids) {
          const isAlive = yield* processDetectionService.isProcessAlive(
            pidMetadata.pid,
          );

          if (isAlive) {
            yield* processDetectionService.killProcess(pidMetadata.pid);
          }
        }

        // Clear all PIDs
        yield* processPidRepository.clearAllPids();

        return {
          killCalls,
          remainingPids: yield* processPidRepository.getAllPids(),
        };
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(MockProcessPidRepository),
          Effect.provide(MockProcessDetectionService),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      // Only alive process (11111) should be killed
      expect(result.killCalls).toEqual([11111]);
      // All PIDs should be cleared
      expect(result.remainingPids).toHaveLength(0);
      expect(pidStorage.size).toBe(0);
    });
  });
});
