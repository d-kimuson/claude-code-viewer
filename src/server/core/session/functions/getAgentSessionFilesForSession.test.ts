import { FileSystem, Path } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import { it } from "@effect/vitest";
import { Effect, type Layer } from "effect";
import { describe, expect } from "vitest";
import { getAgentSessionFilesForSession } from "./getAgentSessionFilesForSession.ts";

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
  it.live("returns empty array when no agent files exist", () =>
    Effect.gen(function* () {
      const result = yield* getAgentSessionFilesForSession("/test/project", "test-session-id");
      expect(result).toEqual([]);
    }).pipe(
      Effect.provide(
        makeFileSystemMock({
          readDirectory: () => Effect.succeed(["main-session.jsonl", "another-session.jsonl"]),
        }),
      ),
      Effect.provide(makePathMock()),
    ),
  );

  it.live("returns empty array when agent files exist but sessionId does not match", () =>
    Effect.gen(function* () {
      const result = yield* getAgentSessionFilesForSession("/test/project", "test-session-id");
      expect(result).toEqual([]);
    }).pipe(
      Effect.provide(
        makeFileSystemMock({
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
        }),
      ),
      Effect.provide(makePathMock()),
    ),
  );

  it.live("returns agent file paths when sessionId matches", () =>
    Effect.gen(function* () {
      const result = yield* getAgentSessionFilesForSession("/test/project", "test-session-id");
      expect(result).toEqual(["/test/project/agent-hash-123.jsonl"]);
    }).pipe(
      Effect.provide(
        makeFileSystemMock({
          readDirectory: () => Effect.succeed(["agent-hash-123.jsonl", "main-session.jsonl"]),
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
        }),
      ),
      Effect.provide(makePathMock()),
    ),
  );

  it.live("returns multiple agent file paths when multiple files match", () =>
    Effect.gen(function* () {
      const result = yield* getAgentSessionFilesForSession("/test/project", "test-session-id");
      expect(result).toHaveLength(2);
      expect(result).toContain("/test/project/agent-hash-123.jsonl");
      expect(result).toContain("/test/project/agent-hash-456.jsonl");
    }).pipe(
      Effect.provide(
        makeFileSystemMock({
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
        }),
      ),
      Effect.provide(makePathMock()),
    ),
  );

  it.live("handles directories and ignores non-file entries", () =>
    Effect.gen(function* () {
      const result = yield* getAgentSessionFilesForSession("/test/project", "test-session-id");
      expect(result).toHaveLength(2);
      expect(result).toContain("/test/project/agent-hash-123.jsonl");
      expect(result).toContain("/test/project/agent-hash-456.jsonl");
    }).pipe(
      Effect.provide(
        makeFileSystemMock({
          readDirectory: () =>
            Effect.succeed(["agent-hash-123.jsonl", "some-directory", "agent-hash-456.jsonl"]),
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
        }),
      ),
      Effect.provide(makePathMock()),
    ),
  );

  it.live("handles file read errors gracefully by skipping the file", () =>
    Effect.gen(function* () {
      const result = yield* getAgentSessionFilesForSession("/test/project", "test-session-id");
      expect(result).toEqual(["/test/project/agent-valid.jsonl"]);
    }).pipe(
      Effect.provide(
        makeFileSystemMock({
          readDirectory: () => Effect.succeed(["agent-corrupted.jsonl", "agent-valid.jsonl"]),
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
        }),
      ),
      Effect.provide(makePathMock()),
    ),
  );

  it.live("handles invalid JSON gracefully by skipping the file", () =>
    Effect.gen(function* () {
      const result = yield* getAgentSessionFilesForSession("/test/project", "test-session-id");
      expect(result).toEqual(["/test/project/agent-valid.jsonl"]);
    }).pipe(
      Effect.provide(
        makeFileSystemMock({
          readDirectory: () => Effect.succeed(["agent-invalid.jsonl", "agent-valid.jsonl"]),
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
        }),
      ),
      Effect.provide(makePathMock()),
    ),
  );
});
