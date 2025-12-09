import { FileSystem, Path } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import { Effect, type Layer } from "effect";
import { describe, expect, test } from "vitest";
import { getAgentSessionFilesForSession } from "./getAgentSessionFilesForSession";

/**
 * Helper function to create a FileSystem mock layer
 */
const makeFileSystemMock = (
  overrides: Partial<FileSystem.FileSystem>,
): Layer.Layer<FileSystem.FileSystem> => {
  return FileSystem.layerNoop(overrides);
};

/**
 * Helper function to create a Path mock layer
 */
const makePathMock = (): Layer.Layer<Path.Path> => {
  return Path.layer;
};

describe("getAgentSessionFilesForSession", () => {
  test("returns empty array when no agent files exist", async () => {
    const FileSystemMock = makeFileSystemMock({
      readDirectory: () =>
        Effect.succeed(["main-session.jsonl", "another-session.jsonl"]),
    });

    const PathMock = makePathMock();

    const result = await Effect.runPromise(
      getAgentSessionFilesForSession("/test/project", "test-session-id").pipe(
        Effect.provide(FileSystemMock),
        Effect.provide(PathMock),
      ),
    );

    expect(result).toEqual([]);
  });

  test("returns empty array when agent files exist but sessionId does not match", async () => {
    const FileSystemMock = makeFileSystemMock({
      readDirectory: () => Effect.succeed(["agent-hash-123.jsonl"]),
      readFileString: (path: string) => {
        if (path.includes("agent-hash-123.jsonl")) {
          return Effect.succeed(
            '{"sessionId":"different-session-id","type":"user","message":{"role":"user","content":"test"}}',
          );
        }
        return Effect.fail(
          new SystemError({
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            reason: "Unknown",
            description: "File not found",
          }),
        );
      },
    });

    const PathMock = makePathMock();

    const result = await Effect.runPromise(
      getAgentSessionFilesForSession("/test/project", "test-session-id").pipe(
        Effect.provide(FileSystemMock),
        Effect.provide(PathMock),
      ),
    );

    expect(result).toEqual([]);
  });

  test("returns agent file paths when sessionId matches", async () => {
    const FileSystemMock = makeFileSystemMock({
      readDirectory: () =>
        Effect.succeed(["agent-hash-123.jsonl", "main-session.jsonl"]),
      readFileString: (path: string) => {
        if (path.includes("agent-hash-123.jsonl")) {
          return Effect.succeed(
            '{"sessionId":"test-session-id","type":"user","message":{"role":"user","content":"test"}}',
          );
        }
        return Effect.fail(
          new SystemError({
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            reason: "Unknown",
            description: "File not found",
          }),
        );
      },
    });

    const PathMock = makePathMock();

    const result = await Effect.runPromise(
      getAgentSessionFilesForSession("/test/project", "test-session-id").pipe(
        Effect.provide(FileSystemMock),
        Effect.provide(PathMock),
      ),
    );

    expect(result).toEqual(["/test/project/agent-hash-123.jsonl"]);
  });

  test("returns multiple agent file paths when multiple files match", async () => {
    const FileSystemMock = makeFileSystemMock({
      readDirectory: () =>
        Effect.succeed([
          "agent-hash-123.jsonl",
          "agent-hash-456.jsonl",
          "agent-hash-789.jsonl",
          "main-session.jsonl",
        ]),
      readFileString: (path: string) => {
        if (path.includes("agent-hash-123.jsonl")) {
          return Effect.succeed(
            '{"sessionId":"test-session-id","type":"user","message":{"role":"user","content":"test"}}',
          );
        }
        if (path.includes("agent-hash-456.jsonl")) {
          return Effect.succeed(
            '{"sessionId":"test-session-id","type":"user","message":{"role":"user","content":"test"}}',
          );
        }
        if (path.includes("agent-hash-789.jsonl")) {
          return Effect.succeed(
            '{"sessionId":"different-session-id","type":"user","message":{"role":"user","content":"test"}}',
          );
        }
        return Effect.fail(
          new SystemError({
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            reason: "Unknown",
            description: "File not found",
          }),
        );
      },
    });

    const PathMock = makePathMock();

    const result = await Effect.runPromise(
      getAgentSessionFilesForSession("/test/project", "test-session-id").pipe(
        Effect.provide(FileSystemMock),
        Effect.provide(PathMock),
      ),
    );

    expect(result).toHaveLength(2);
    expect(result).toContain("/test/project/agent-hash-123.jsonl");
    expect(result).toContain("/test/project/agent-hash-456.jsonl");
  });

  test("handles directories and ignores non-file entries", async () => {
    const FileSystemMock = makeFileSystemMock({
      readDirectory: () =>
        Effect.succeed([
          "agent-hash-123.jsonl",
          "some-directory",
          "agent-hash-456.jsonl",
        ]),
      readFileString: (path: string) => {
        if (path.includes("agent-hash-123.jsonl")) {
          return Effect.succeed(
            '{"sessionId":"test-session-id","type":"user","message":{"role":"user","content":"test"}}',
          );
        }
        if (path.includes("agent-hash-456.jsonl")) {
          return Effect.succeed(
            '{"sessionId":"test-session-id","type":"user","message":{"role":"user","content":"test"}}',
          );
        }
        return Effect.fail(
          new SystemError({
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            reason: "Unknown",
            description: "File not found",
          }),
        );
      },
    });

    const PathMock = makePathMock();

    const result = await Effect.runPromise(
      getAgentSessionFilesForSession("/test/project", "test-session-id").pipe(
        Effect.provide(FileSystemMock),
        Effect.provide(PathMock),
      ),
    );

    expect(result).toHaveLength(2);
    expect(result).toContain("/test/project/agent-hash-123.jsonl");
    expect(result).toContain("/test/project/agent-hash-456.jsonl");
  });

  test("handles file read errors gracefully by skipping the file", async () => {
    const FileSystemMock = makeFileSystemMock({
      readDirectory: () =>
        Effect.succeed(["agent-corrupted.jsonl", "agent-valid.jsonl"]),
      readFileString: (path: string) => {
        if (path.includes("agent-corrupted.jsonl")) {
          return Effect.fail(
            new SystemError({
              module: "FileSystem",
              method: "readFileString",
              pathOrDescriptor: path,
              reason: "Unknown",
              description: "Permission denied",
            }),
          );
        }
        if (path.includes("agent-valid.jsonl")) {
          return Effect.succeed(
            '{"sessionId":"test-session-id","type":"user","message":{"role":"user","content":"test"}}',
          );
        }
        return Effect.fail(
          new SystemError({
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            reason: "Unknown",
            description: "File not found",
          }),
        );
      },
    });

    const PathMock = makePathMock();

    const result = await Effect.runPromise(
      getAgentSessionFilesForSession("/test/project", "test-session-id").pipe(
        Effect.provide(FileSystemMock),
        Effect.provide(PathMock),
      ),
    );

    expect(result).toEqual(["/test/project/agent-valid.jsonl"]);
  });

  test("handles invalid JSON gracefully by skipping the file", async () => {
    const FileSystemMock = makeFileSystemMock({
      readDirectory: () =>
        Effect.succeed(["agent-invalid.jsonl", "agent-valid.jsonl"]),
      readFileString: (path: string) => {
        if (path.includes("agent-invalid.jsonl")) {
          return Effect.succeed("this is not valid json");
        }
        if (path.includes("agent-valid.jsonl")) {
          return Effect.succeed(
            '{"sessionId":"test-session-id","type":"user","message":{"role":"user","content":"test"}}',
          );
        }
        return Effect.fail(
          new SystemError({
            module: "FileSystem",
            method: "readFileString",
            pathOrDescriptor: path,
            reason: "Unknown",
            description: "File not found",
          }),
        );
      },
    });

    const PathMock = makePathMock();

    const result = await Effect.runPromise(
      getAgentSessionFilesForSession("/test/project", "test-session-id").pipe(
        Effect.provide(FileSystemMock),
        Effect.provide(PathMock),
      ),
    );

    expect(result).toEqual(["/test/project/agent-valid.jsonl"]);
  });
});
