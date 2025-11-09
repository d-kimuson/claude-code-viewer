import { Command } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";

/**
 * Represents information about a running process
 */
export type ProcessInfo = {
  pid: number;
  command: string;
};

/**
 * Options for detecting Claude Code process PID
 */
export type DetectClaudeCodePidOptions = {
  beforeProcesses: ProcessInfo[];
  afterProcesses: ProcessInfo[];
  cwd: string;
  commandPattern: string;
};

const LayerImpl = Effect.gen(function* () {
  /**
   * Get current process list from the system
   * Uses `ps -eo pid,command` for POSIX compatibility
   */
  const getCurrentProcessList = () =>
    Effect.gen(function* () {
      // Use ps with POSIX-compatible options
      const psCommand = Command.make("ps", "-eo", "pid,command").pipe(
        Command.runInShell(false),
      );
      const psOutput = yield* Command.string(psCommand).pipe(Effect.orDie);

      // Parse ps output
      const lines = psOutput.trim().split("\n");
      // Skip header line
      const processLines = lines.slice(1);

      const processes: ProcessInfo[] = [];

      for (const line of processLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Split on first whitespace to separate PID from command
        const firstSpaceIndex = trimmedLine.indexOf(" ");
        if (firstSpaceIndex === -1) continue;

        const pidStr = trimmedLine.slice(0, firstSpaceIndex).trim();
        const cmd = trimmedLine.slice(firstSpaceIndex + 1).trim();

        const pid = Number.parseInt(pidStr, 10);
        if (Number.isNaN(pid)) continue;

        processes.push({
          pid,
          command: cmd,
        });
      }

      return processes;
    });

  /**
   * Detect Claude Code process PID by comparing before/after process snapshots
   * Returns the PID of the newly spawned process, or null if not detected
   *
   * Detection strategy:
   * 1. Filter by new PIDs (not in beforeProcesses)
   * 2. Match commandPattern (e.g., "claude-agent-sdk")
   * 3. Prefer processes whose command contains the cwd (additional safety check)
   * 4. If multiple matches, return the one with the highest PID (most recent)
   */
  const detectClaudeCodePid = (options: DetectClaudeCodePidOptions) =>
    Effect.gen(function* () {
      const { beforeProcesses, afterProcesses, cwd, commandPattern } = options;

      // Create a set of PIDs that existed before
      const beforePids = new Set(beforeProcesses.map((p) => p.pid));

      // Find new processes that match the command pattern
      const newProcesses = afterProcesses.filter((p) => {
        const isNew = !beforePids.has(p.pid);
        const matchesPattern = p.command.includes(commandPattern);
        return isNew && matchesPattern;
      });

      // If multiple matches, prefer the one whose command contains cwd
      // This reduces false positives when multiple Claude Code processes spawn simultaneously
      if (newProcesses.length > 1) {
        const withCwd = newProcesses.filter((p) => p.command.includes(cwd));
        if (withCwd.length > 0) {
          const sorted = withCwd.sort((a, b) => b.pid - a.pid);
          const firstProcess = sorted[0];
          if (!firstProcess) return null;
          return firstProcess.pid;
        }
      }

      // If single match or no cwd match, return the one with the highest PID (most recent)
      if (newProcesses.length > 0) {
        const sorted = newProcesses.sort((a, b) => b.pid - a.pid);
        const firstProcess = sorted[0];
        if (!firstProcess) return null;
        return firstProcess.pid;
      }

      return null;
    });

  /**
   * Check if a process with the given PID is alive
   * Uses `kill -0` to check process existence without actually killing it
   */
  const isProcessAlive = (pid: number) =>
    Effect.gen(function* () {
      // Use kill -0 to check if process exists
      // Returns 0 if process exists, non-zero otherwise
      const killCommand = Command.make("kill", "-0", pid.toString()).pipe(
        Command.runInShell(false),
      );
      const exitCode = yield* Command.exitCode(killCommand).pipe(
        Effect.catchAll(() => Effect.succeed(1)),
      );

      return exitCode === 0;
    });

  /**
   * Kill a process with the given PID
   * Returns true if successful, false if the process doesn't exist
   *
   * Signal strategy:
   * - Uses SIGTERM (default signal) to allow graceful shutdown
   * - This is called after a 3-second wait following AbortController.abort()
   * - If stronger termination is needed in the future, consider SIGKILL (-9)
   *   but SIGTERM is preferred as it allows cleanup handlers to run
   */
  const killProcess = (pid: number) =>
    Effect.gen(function* () {
      const killCommand = Command.make("kill", pid.toString()).pipe(
        Command.runInShell(false),
      );
      const exitCode = yield* Command.exitCode(killCommand).pipe(
        Effect.catchAll(() => Effect.succeed(1)),
      );

      return exitCode === 0;
    });

  return {
    getCurrentProcessList,
    detectClaudeCodePid,
    isProcessAlive,
    killProcess,
  };
});

export type IProcessDetectionService = InferEffect<typeof LayerImpl>;

export class ProcessDetectionService extends Context.Tag(
  "ProcessDetectionService",
)<ProcessDetectionService, IProcessDetectionService>() {
  static Live = Layer.effect(this, LayerImpl);
}
