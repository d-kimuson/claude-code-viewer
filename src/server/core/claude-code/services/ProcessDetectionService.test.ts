import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import { ProcessDetectionService } from "./ProcessDetectionService";

describe("ProcessDetectionService", () => {
  describe("getCurrentProcessList", () => {
    it("should return list of process information", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ProcessDetectionService;
        const processes = yield* service.getCurrentProcessList();

        return processes;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessDetectionService.Live),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      // Should return an array of process info
      expect(Array.isArray(result)).toBe(true);
      // Each process should have pid and command
      if (result.length > 0) {
        const firstProcess = result[0];
        if (firstProcess) {
          expect(firstProcess).toHaveProperty("pid");
          expect(firstProcess).toHaveProperty("command");
          expect(typeof firstProcess.pid).toBe("number");
          expect(typeof firstProcess.command).toBe("string");
        }
      }
    });

    it("should include current process in the list", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ProcessDetectionService;
        const processes = yield* service.getCurrentProcessList();

        return processes;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessDetectionService.Live),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      const currentPid = process.pid;
      const currentProcess = result.find((p) => p.pid === currentPid);
      expect(currentProcess).toBeDefined();
    });
  });

  describe("detectClaudeCodePid", () => {
    it("should detect newly spawned process by comparing before/after snapshots", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ProcessDetectionService;

        // Create mock process lists
        const beforeProcesses = [
          { pid: 1000, command: "/usr/bin/existing-process" },
          { pid: 1001, command: "/usr/bin/another-process" },
        ];

        const afterProcesses = [
          { pid: 1000, command: "/usr/bin/existing-process" },
          { pid: 1001, command: "/usr/bin/another-process" },
          { pid: 1002, command: "/usr/bin/sleep 30" },
        ];

        // Detect the new process
        const detectedPid = yield* service.detectClaudeCodePid({
          beforeProcesses,
          afterProcesses,
          cwd: "/tmp",
          commandPattern: "sleep",
        });

        return detectedPid;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessDetectionService.Live),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      // Should detect PID 1002
      expect(result).toBe(1002);
    });

    it("should return null if no new process is detected", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ProcessDetectionService;

        // Same process list before and after
        const beforeProcesses = [
          { pid: 1000, command: "/usr/bin/existing-process" },
          { pid: 1001, command: "/usr/bin/another-process" },
        ];
        const afterProcesses = beforeProcesses;

        // Try to detect (should fail)
        const detectedPid = yield* service.detectClaudeCodePid({
          beforeProcesses,
          afterProcesses,
          cwd: "/tmp",
          commandPattern: "claude-code-non-existent",
        });

        return detectedPid;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessDetectionService.Live),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      expect(result).toBeNull();
    });

    it("should select the most recent PID when multiple matches exist", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ProcessDetectionService;

        const beforeProcesses = [
          { pid: 1000, command: "/usr/bin/existing-process" },
        ];

        const afterProcesses = [
          { pid: 1000, command: "/usr/bin/existing-process" },
          { pid: 1002, command: "claude-code task1" },
          { pid: 1005, command: "claude-code task2" },
          { pid: 1003, command: "claude-code task3" },
        ];

        const detectedPid = yield* service.detectClaudeCodePid({
          beforeProcesses,
          afterProcesses,
          cwd: "/tmp",
          commandPattern: "claude-code",
        });

        return detectedPid;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessDetectionService.Live),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      // Should select the highest PID (most recent)
      expect(result).toBe(1005);
    });
  });

  describe("isProcessAlive", () => {
    it("should return true for current process", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ProcessDetectionService;
        const currentPid = process.pid;

        const isAlive = yield* service.isProcessAlive(currentPid);

        return isAlive;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessDetectionService.Live),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      expect(result).toBe(true);
    });

    it("should return false for non-existent process", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ProcessDetectionService;
        // Get the maximum PID on the system and use a much larger value
        const processes = yield* service.getCurrentProcessList();
        const maxPid = Math.max(...processes.map((p) => p.pid));
        // Use a PID that's guaranteed not to exist (much higher than max)
        const fakePid = maxPid + 100000;

        const isAlive = yield* service.isProcessAlive(fakePid);

        return isAlive;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ProcessDetectionService.Live),
          Effect.provide(testPlatformLayer()),
          Effect.provide(NodeContext.layer),
        ),
      );

      expect(result).toBe(false);
    });
  });
});
