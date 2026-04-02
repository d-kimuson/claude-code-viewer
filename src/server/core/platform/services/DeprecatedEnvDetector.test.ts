import { it } from "@effect/vitest";
/* oxlint-disable node/no-process-env -- testing environment variable detection */
import { Effect, Either } from "effect";
import { beforeEach, describe, expect, vi } from "vitest";

// We need to access the internal functions for testing
// Since they're not exported, we'll test the public API via Effect

describe("DeprecatedEnvDetector", () => {
  beforeEach(() => {
    // Clear all deprecated environment variables before each test
    vi.resetModules();
    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    delete process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD;
    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    delete process.env.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH;
    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    delete process.env.CCV_PASSWORD;
  });

  it.live("should not show warnings when no deprecated env vars are set", () =>
    Effect.gen(function* () {
      const consoleSpy = vi.spyOn(console, "log");

      // Set only valid env vars
      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      process.env.CCV_PASSWORD = "test";

      // Dynamically import after env vars are set
      const { checkDeprecatedEnvs } = yield* Effect.promise(
        () => import("./DeprecatedEnvDetector.ts"),
      );

      yield* checkDeprecatedEnvs;

      expect(consoleSpy).not.toHaveBeenCalled();

      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      delete process.env.CCV_PASSWORD;
    }),
  );

  it.live("should show warning and throw error for removed CLAUDE_CODE_VIEWER_AUTH_PASSWORD", () =>
    Effect.gen(function* () {
      const consoleSpy = vi.spyOn(console, "log");

      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD = "test";

      const { checkDeprecatedEnvs } = yield* Effect.promise(
        () => import("./DeprecatedEnvDetector.ts"),
      );

      const result = yield* Effect.either(checkDeprecatedEnvs);

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(String(result.left)).toContain(
          "Cannot start server: removed environment variables detected",
        );
      }

      expect(consoleSpy).toHaveBeenCalled();

      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("REMOVED");
      expect(output).toContain("CLAUDE_CODE_VIEWER_AUTH_PASSWORD");
      expect(output).toContain("CCV_PASSWORD");
      expect(output).toContain("--password");

      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      delete process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD;
    }),
  );

  it.live(
    "should show warning and throw error for removed CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH",
    () =>
      Effect.gen(function* () {
        const consoleSpy = vi.spyOn(console, "log");

        // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
        process.env.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH = "/path/to/claude";

        const { checkDeprecatedEnvs } = yield* Effect.promise(
          () => import("./DeprecatedEnvDetector.ts"),
        );

        const result = yield* Effect.either(checkDeprecatedEnvs);

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(String(result.left)).toContain(
            "Cannot start server: removed environment variables detected",
          );
        }

        expect(consoleSpy).toHaveBeenCalled();

        const output = consoleSpy.mock.calls.flat().join("\n");
        expect(output).toContain("REMOVED");
        expect(output).toContain("CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH");
        expect(output).toContain("CCV_CC_EXECUTABLE_PATH");
        expect(output).toContain("--executable");

        // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
        delete process.env.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH;
      }),
  );

  it.live("should show error for multiple removed env vars", () =>
    Effect.gen(function* () {
      const consoleSpy = vi.spyOn(console, "log");

      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD = "test";
      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      process.env.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH = "/path/to/claude";

      const { checkDeprecatedEnvs } = yield* Effect.promise(
        () => import("./DeprecatedEnvDetector.ts"),
      );

      const result = yield* Effect.either(checkDeprecatedEnvs);

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(String(result.left)).toContain(
          "Cannot start server: removed environment variables detected",
        );
      }

      expect(consoleSpy).toHaveBeenCalled();

      const output = consoleSpy.mock.calls.flat().join("\n");

      // Check both removed env vars are present
      expect(output).toContain("CLAUDE_CODE_VIEWER_AUTH_PASSWORD");
      expect(output).toContain("CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH");

      // Check the migration guide link
      expect(output).toContain("https://github.com/d-kimuson/claude-code-viewer#configuration");

      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      delete process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD;
      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      delete process.env.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH;
    }),
  );

  it.live("should include configuration link in output", () =>
    Effect.gen(function* () {
      const consoleSpy = vi.spyOn(console, "log");

      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD = "test";

      const { checkDeprecatedEnvs } = yield* Effect.promise(
        () => import("./DeprecatedEnvDetector.ts"),
      );

      yield* Effect.either(checkDeprecatedEnvs);

      const output = consoleSpy.mock.calls.flat().join("\n");
      expect(output).toContain("https://github.com/d-kimuson/claude-code-viewer#configuration");

      // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
      delete process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD;
    }),
  );
});
