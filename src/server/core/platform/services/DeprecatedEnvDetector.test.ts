import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("should not show warnings when no deprecated env vars are set", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    // Set only valid env vars
    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    process.env.CCV_PASSWORD = "test";

    // Dynamically import after env vars are set
    const { checkDeprecatedEnvs } = await import("./DeprecatedEnvDetector");

    await Effect.runPromise(checkDeprecatedEnvs);

    expect(consoleSpy).not.toHaveBeenCalled();

    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    delete process.env.CCV_PASSWORD;
  });

  it("should show warning and throw error for removed CLAUDE_CODE_VIEWER_AUTH_PASSWORD", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD = "test";

    const { checkDeprecatedEnvs } = await import("./DeprecatedEnvDetector");

    await expect(Effect.runPromise(checkDeprecatedEnvs)).rejects.toThrow(
      "Cannot start server: removed environment variables detected",
    );

    expect(consoleSpy).toHaveBeenCalled();

    const output = consoleSpy.mock.calls.flat().join("\n");
    expect(output).toContain("REMOVED");
    expect(output).toContain("CLAUDE_CODE_VIEWER_AUTH_PASSWORD");
    expect(output).toContain("CCV_PASSWORD");
    expect(output).toContain("--password");

    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    delete process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD;
  });

  it("should show warning and throw error for removed CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    process.env.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH = "/path/to/claude";

    const { checkDeprecatedEnvs } = await import("./DeprecatedEnvDetector");

    await expect(Effect.runPromise(checkDeprecatedEnvs)).rejects.toThrow(
      "Cannot start server: removed environment variables detected",
    );

    expect(consoleSpy).toHaveBeenCalled();

    const output = consoleSpy.mock.calls.flat().join("\n");
    expect(output).toContain("REMOVED");
    expect(output).toContain("CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH");
    expect(output).toContain("CCV_CC_EXECUTABLE_PATH");
    expect(output).toContain("--executable");

    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    delete process.env.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH;
  });

  it("should show error for multiple removed env vars", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD = "test";
    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    process.env.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH = "/path/to/claude";

    const { checkDeprecatedEnvs } = await import("./DeprecatedEnvDetector");

    await expect(Effect.runPromise(checkDeprecatedEnvs)).rejects.toThrow(
      "Cannot start server: removed environment variables detected",
    );

    expect(consoleSpy).toHaveBeenCalled();

    const output = consoleSpy.mock.calls.flat().join("\n");

    // Check both removed env vars are present
    expect(output).toContain("CLAUDE_CODE_VIEWER_AUTH_PASSWORD");
    expect(output).toContain("CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH");

    // Check the migration guide link
    expect(output).toContain(
      "https://github.com/d-kimuson/claude-code-viewer#configuration",
    );

    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    delete process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD;
    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    delete process.env.CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH;
  });

  it("should include configuration link in output", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD = "test";

    const { checkDeprecatedEnvs } = await import("./DeprecatedEnvDetector");

    await expect(Effect.runPromise(checkDeprecatedEnvs)).rejects.toThrow(
      "Cannot start server: removed environment variables detected",
    );

    const output = consoleSpy.mock.calls.flat().join("\n");
    expect(output).toContain(
      "https://github.com/d-kimuson/claude-code-viewer#configuration",
    );

    // biome-ignore lint/style/noProcessEnv: Testing environment variable detection
    delete process.env.CLAUDE_CODE_VIEWER_AUTH_PASSWORD;
  });
});
