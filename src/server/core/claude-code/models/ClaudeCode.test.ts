import { CommandExecutor, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { EnvService } from "../../platform/services/EnvService";
import * as ClaudeCode from "./ClaudeCode";

describe("ClaudeCode.isNpxShimPath", () => {
  describe("should return true for _npx cache paths", () => {
    it("detects _npx cache path (Linux/macOS)", () => {
      expect(
        ClaudeCode.isNpxShimPath(
          "/home/user/.npm/_npx/abc123/node_modules/.bin/claude",
        ),
      ).toBe(true);
    });

    it("detects _npx cache path (Windows style)", () => {
      expect(
        ClaudeCode.isNpxShimPath(
          "C:\\Users\\user\\.npm\\_npx\\abc123\\node_modules\\.bin\\claude",
        ),
      ).toBe(true);
    });

    it("detects _npx cache path with custom npm cache dir", () => {
      expect(
        ClaudeCode.isNpxShimPath(
          "/custom/cache/_npx/abc123/node_modules/.bin/claude",
        ),
      ).toBe(true);
    });

    it("detects deeply nested _npx cache path", () => {
      expect(
        ClaudeCode.isNpxShimPath(
          "/var/cache/npm/_npx/some-hash/node_modules/.bin/claude",
        ),
      ).toBe(true);
    });
  });

  describe("should return false for legitimate claude paths", () => {
    it("allows global npm bin path (Linux/macOS)", () => {
      expect(ClaudeCode.isNpxShimPath("/usr/local/bin/claude")).toBe(false);
    });

    it("allows Homebrew path (macOS)", () => {
      expect(ClaudeCode.isNpxShimPath("/opt/homebrew/bin/claude")).toBe(false);
    });

    it("allows user local bin path", () => {
      expect(ClaudeCode.isNpxShimPath("/home/user/.local/bin/claude")).toBe(
        false,
      );
    });

    it("allows nvm global path", () => {
      expect(
        ClaudeCode.isNpxShimPath(
          "/home/user/.nvm/versions/node/v20.0.0/bin/claude",
        ),
      ).toBe(false);
    });

    it("allows Windows global npm path", () => {
      expect(
        ClaudeCode.isNpxShimPath(
          "C:\\Users\\user\\AppData\\Roaming\\npm\\claude",
        ),
      ).toBe(false);
    });

    it("allows project-local node_modules/.bin (user may intentionally add to PATH)", () => {
      expect(
        ClaudeCode.isNpxShimPath("/some/project/node_modules/.bin/claude"),
      ).toBe(false);
    });

    it("allows project-local node_modules/.bin (Windows style)", () => {
      expect(
        ClaudeCode.isNpxShimPath("C:\\project\\node_modules\\.bin\\claude"),
      ).toBe(false);
    });

    it("allows nested project node_modules/.bin", () => {
      expect(
        ClaudeCode.isNpxShimPath(
          "/project/packages/foo/node_modules/.bin/claude",
        ),
      ).toBe(false);
    });
  });
});

describe("ClaudeCode.Config", () => {
  describe("when environment variable CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH is not set", () => {
    it("should correctly parse results of 'which claude' and 'claude --version'", async () => {
      const CommandExecutorTest = Layer.effect(
        CommandExecutor.CommandExecutor,
        Effect.map(CommandExecutor.CommandExecutor, (realExecutor) => ({
          ...realExecutor,
          string: (() => {
            const responses = ["/path/to/claude", "1.0.53 (Claude Code)\n"];
            return () => Effect.succeed(responses.shift() ?? "");
          })(),
        })),
      ).pipe(Layer.provide(NodeContext.layer));

      const config = await Effect.runPromise(
        ClaudeCode.Config.pipe(
          Effect.provide(EnvService.Live),
          Effect.provide(Path.layer),
          Effect.provide(CommandExecutorTest),
        ),
      );

      expect(config.claudeCodeExecutablePath).toBe("/path/to/claude");

      expect(config.claudeCodeVersion).toStrictEqual({
        major: 1,
        minor: 0,
        patch: 53,
      });
    });

    it("should skip npx shim path and use fallback from runInShell", async () => {
      const CommandExecutorTest = Layer.effect(
        CommandExecutor.CommandExecutor,
        Effect.map(CommandExecutor.CommandExecutor, (realExecutor) => ({
          ...realExecutor,
          string: (() => {
            const responses = [
              // 1st: which claude (without shell) returns npx shim
              "/home/user/.npm/_npx/abc123/node_modules/.bin/claude",
              // 2nd: which claude (with shell) returns legitimate path
              "/usr/local/bin/claude",
              // 3rd: claude --version
              "1.0.100 (Claude Code)\n",
            ];
            return () => Effect.succeed(responses.shift() ?? "");
          })(),
        })),
      ).pipe(Layer.provide(NodeContext.layer));

      const config = await Effect.runPromise(
        ClaudeCode.Config.pipe(
          Effect.provide(EnvService.Live),
          Effect.provide(Path.layer),
          Effect.provide(CommandExecutorTest),
        ),
      );

      // npx shim がスキップされ、fallback の /usr/local/bin/claude が使用される
      expect(config.claudeCodeExecutablePath).toBe("/usr/local/bin/claude");
      expect(config.claudeCodeVersion).toStrictEqual({
        major: 1,
        minor: 0,
        patch: 100,
      });
    });

    it("should fail when both which results are npx shim paths", async () => {
      const CommandExecutorTest = Layer.effect(
        CommandExecutor.CommandExecutor,
        Effect.map(CommandExecutor.CommandExecutor, (realExecutor) => ({
          ...realExecutor,
          string: (() => {
            const responses = [
              // 1st: which claude (without shell) returns npx shim
              "/home/user/.npm/_npx/abc123/node_modules/.bin/claude",
              // 2nd: which claude (with shell) also returns npx shim
              "/custom/cache/_npx/def456/node_modules/.bin/claude",
            ];
            return () => Effect.succeed(responses.shift() ?? "");
          })(),
        })),
      ).pipe(Layer.provide(NodeContext.layer));

      await expect(
        Effect.runPromise(
          ClaudeCode.Config.pipe(
            Effect.provide(EnvService.Live),
            Effect.provide(Path.layer),
            Effect.provide(CommandExecutorTest),
          ),
        ),
      ).rejects.toThrow("Claude Code CLI not found in any location");
    });

    it("should use project-local node_modules/.bin if it is the first result (not _npx)", async () => {
      const CommandExecutorTest = Layer.effect(
        CommandExecutor.CommandExecutor,
        Effect.map(CommandExecutor.CommandExecutor, (realExecutor) => ({
          ...realExecutor,
          string: (() => {
            const responses = [
              // 1st: which claude (without shell) returns local node_modules (NOT _npx)
              "/some/project/node_modules/.bin/claude",
              // 2nd: claude --version
              "2.0.30 (Claude Code)\n",
            ];
            return () => Effect.succeed(responses.shift() ?? "");
          })(),
        })),
      ).pipe(Layer.provide(NodeContext.layer));

      const config = await Effect.runPromise(
        ClaudeCode.Config.pipe(
          Effect.provide(EnvService.Live),
          Effect.provide(Path.layer),
          Effect.provide(CommandExecutorTest),
        ),
      );

      // プロジェクトローカルの node_modules/.bin はユーザーが意図的に PATH を通している可能性があるので使用する
      expect(config.claudeCodeExecutablePath).toBe(
        "/some/project/node_modules/.bin/claude",
      );
      expect(config.claudeCodeVersion).toStrictEqual({
        major: 2,
        minor: 0,
        patch: 30,
      });
    });
  });
});

describe("ClaudeCode.AvailableFeatures", () => {
  describe("when claudeCodeVersion is null", () => {
    it("canUseTool and uuidOnSDKMessage should be false", () => {
      const features = ClaudeCode.getAvailableFeatures(null);
      expect(features.canUseTool).toBe(false);
      expect(features.uuidOnSDKMessage).toBe(false);
    });
  });

  describe("when claudeCodeVersion is v1.0.81", () => {
    it("canUseTool should be false, uuidOnSDKMessage should be false", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 1,
        minor: 0,
        patch: 81,
      });
      expect(features.canUseTool).toBe(false);
      expect(features.uuidOnSDKMessage).toBe(false);
    });
  });

  describe("when claudeCodeVersion is v1.0.82", () => {
    it("canUseTool should be true, uuidOnSDKMessage should be false", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 1,
        minor: 0,
        patch: 82,
      });
      expect(features.canUseTool).toBe(true);
      expect(features.uuidOnSDKMessage).toBe(false);
    });
  });

  describe("when claudeCodeVersion is v1.0.85", () => {
    it("canUseTool should be true, uuidOnSDKMessage should be false", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 1,
        minor: 0,
        patch: 85,
      });
      expect(features.canUseTool).toBe(true);
      expect(features.uuidOnSDKMessage).toBe(false);
    });
  });

  describe("when claudeCodeVersion is v1.0.86", () => {
    it("canUseTool should be true, uuidOnSDKMessage should be true", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 1,
        minor: 0,
        patch: 86,
      });
      expect(features.canUseTool).toBe(true);
      expect(features.uuidOnSDKMessage).toBe(true);
    });
  });

  describe("sidechainSeparation feature flag", () => {
    it("should be false when claudeCodeVersion is null", () => {
      const features = ClaudeCode.getAvailableFeatures(null);
      expect(features.sidechainSeparation).toBe(false);
    });

    it("should be false when claudeCodeVersion is v2.0.27", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 2,
        minor: 0,
        patch: 27,
      });
      expect(features.sidechainSeparation).toBe(false);
    });

    it("should be true when claudeCodeVersion is v2.0.28", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 2,
        minor: 0,
        patch: 28,
      });
      expect(features.sidechainSeparation).toBe(true);
    });

    it("should be true when claudeCodeVersion is v2.0.30 (greater than threshold)", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 2,
        minor: 0,
        patch: 30,
      });
      expect(features.sidechainSeparation).toBe(true);
    });

    it("should be true when claudeCodeVersion is v2.1.0 (higher minor version)", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 2,
        minor: 1,
        patch: 0,
      });
      expect(features.sidechainSeparation).toBe(true);
    });

    it("should be false when claudeCodeVersion is v1.x.x (lower major version)", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 1,
        minor: 0,
        patch: 200,
      });
      expect(features.sidechainSeparation).toBe(false);
    });
  });
});
