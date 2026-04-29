import { CommandExecutor } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { describe, expect } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import * as ClaudeCode from "./ClaudeCode.ts";

describe("ClaudeCode.claudeCodePathPriority", () => {
  describe("should return 0 for npx cache paths (lowest priority)", () => {
    it("detects _npx cache path (Linux/macOS)", () => {
      expect(
        ClaudeCode.claudeCodePathPriority("/home/user/.npm/_npx/abc123/node_modules/.bin/claude"),
      ).toBe(0);
    });

    it("detects _npx cache path (Windows style)", () => {
      expect(
        ClaudeCode.claudeCodePathPriority(
          "C:\\Users\\user\\.npm\\_npx\\abc123\\node_modules\\.bin\\claude",
        ),
      ).toBe(0);
    });

    it("detects _npx cache path with custom npm cache dir", () => {
      expect(
        ClaudeCode.claudeCodePathPriority("/custom/cache/_npx/abc123/node_modules/.bin/claude"),
      ).toBe(0);
    });

    it("detects deeply nested _npx cache path", () => {
      expect(
        ClaudeCode.claudeCodePathPriority("/var/cache/npm/_npx/some-hash/node_modules/.bin/claude"),
      ).toBe(0);
    });
  });

  describe("should return 1 for project-local node_modules/.bin paths", () => {
    it("detects current project node_modules/.bin", () => {
      const path = `${process.cwd()}/node_modules/.bin/claude`;
      expect(ClaudeCode.claudeCodePathPriority(path)).toBe(1);
    });
  });

  describe("should return 2 for legitimate claude paths (highest priority)", () => {
    it("prioritizes global npm bin path (Linux/macOS)", () => {
      expect(ClaudeCode.claudeCodePathPriority("/usr/local/bin/claude")).toBe(2);
    });

    it("prioritizes Homebrew path (macOS)", () => {
      expect(ClaudeCode.claudeCodePathPriority("/opt/homebrew/bin/claude")).toBe(2);
    });

    it("prioritizes user local bin path", () => {
      expect(ClaudeCode.claudeCodePathPriority("/home/user/.local/bin/claude")).toBe(2);
    });

    it("prioritizes nvm global path", () => {
      expect(
        ClaudeCode.claudeCodePathPriority("/home/user/.nvm/versions/node/v20.0.0/bin/claude"),
      ).toBe(2);
    });

    it("prioritizes Windows global npm path", () => {
      expect(
        ClaudeCode.claudeCodePathPriority("C:\\Users\\user\\AppData\\Roaming\\npm\\claude"),
      ).toBe(2);
    });

    it("prioritizes non-current-project node_modules/.bin", () => {
      expect(
        ClaudeCode.claudeCodePathPriority("/some/other/project/node_modules/.bin/claude"),
      ).toBe(2);
    });

    it("prioritizes non-current-project node_modules/.bin (Windows style)", () => {
      expect(
        ClaudeCode.claudeCodePathPriority("C:\\some\\other\\project\\node_modules\\.bin\\claude"),
      ).toBe(2);
    });

    it("prioritizes nested project node_modules/.bin", () => {
      expect(
        ClaudeCode.claudeCodePathPriority("/project/packages/foo/node_modules/.bin/claude"),
      ).toBe(2);
    });
  });
});

describe("ClaudeCode.Config", () => {
  describe("when environment variable CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH is not set", () => {
    it.live("should resolve claude path without shell execution", () =>
      Effect.gen(function* () {
        const shellModes: Array<boolean | string> = [];

        const CommandExecutorTest = Layer.effect(
          CommandExecutor.CommandExecutor,
          Effect.map(CommandExecutor.CommandExecutor, (realExecutor) => ({
            ...realExecutor,
            string: (command, _encoding) => {
              if (command._tag === "StandardCommand") {
                shellModes.push(command.shell);

                if (command.command === "which" || command.command === "where") {
                  return Effect.succeed("/usr/local/bin/claude\n");
                }

                if (command.args.includes("--version")) {
                  return Effect.succeed("1.0.125 (Claude Code)\n");
                }
              }

              return Effect.succeed("");
            },
          })),
        ).pipe(Layer.provide(NodeContext.layer));

        const config = yield* ClaudeCode.Config.pipe(Effect.provide(CommandExecutorTest));

        expect(config.claudeCodeExecutablePath).toBe("/usr/local/bin/claude");
        expect(shellModes.every((mode) => mode === false)).toBe(true);
      }).pipe(Effect.provide(testPlatformLayer())),
    );

    it.live("should correctly parse results of 'which claude' and 'claude --version'", () =>
      Effect.gen(function* () {
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

        const config = yield* ClaudeCode.Config.pipe(Effect.provide(CommandExecutorTest));

        expect(config.claudeCodeExecutablePath).toBe("/path/to/claude");

        expect(config.claudeCodeVersion).toStrictEqual({
          major: 1,
          minor: 0,
          patch: 53,
        });
      }).pipe(Effect.provide(testPlatformLayer())),
    );

    it.live("should skip npx shim path and use legitimate path with higher priority", () =>
      Effect.gen(function* () {
        const CommandExecutorTest = Layer.effect(
          CommandExecutor.CommandExecutor,
          Effect.map(CommandExecutor.CommandExecutor, (realExecutor) => ({
            ...realExecutor,
            string: (() => {
              const responses = [
                // 1st: which -a claude returns multiple paths (npx shim + legitimate)
                "/home/user/.npm/_npx/abc123/node_modules/.bin/claude\n/usr/local/bin/claude",
                // 2nd: claude --version
                "1.0.100 (Claude Code)\n",
              ];
              return () => Effect.succeed(responses.shift() ?? "");
            })(),
          })),
        ).pipe(Layer.provide(NodeContext.layer));

        const config = yield* ClaudeCode.Config.pipe(Effect.provide(CommandExecutorTest));

        // npx shim がスキップされ、高優先度の /usr/local/bin/claude が使用される
        expect(config.claudeCodeExecutablePath).toBe("/usr/local/bin/claude");
        expect(config.claudeCodeVersion).toStrictEqual({
          major: 1,
          minor: 0,
          patch: 100,
        });
      }).pipe(Effect.provide(testPlatformLayer())),
    );

    it.live("should use first npx shim path when all paths are npx shims", () =>
      Effect.gen(function* () {
        const CommandExecutorTest = Layer.effect(
          CommandExecutor.CommandExecutor,
          Effect.map(CommandExecutor.CommandExecutor, (realExecutor) => ({
            ...realExecutor,
            string: (() => {
              const responses = [
                // 1st: which -a claude returns only npx shim paths
                "/home/user/.npm/_npx/abc123/node_modules/.bin/claude\n/custom/cache/_npx/def456/node_modules/.bin/claude",
                // 2nd: claude --version
                "1.0.50 (Claude Code)\n",
              ];
              return () => Effect.succeed(responses.shift() ?? "");
            })(),
          })),
        ).pipe(Layer.provide(NodeContext.layer));

        const config = yield* ClaudeCode.Config.pipe(Effect.provide(CommandExecutorTest));

        // すべてが同じ優先度（0）の場合、最初のパスが使用される
        expect(config.claudeCodeExecutablePath).toBe(
          "/home/user/.npm/_npx/abc123/node_modules/.bin/claude",
        );
        expect(config.claudeCodeVersion).toStrictEqual({
          major: 1,
          minor: 0,
          patch: 50,
        });
      }).pipe(Effect.provide(testPlatformLayer())),
    );

    it.live("should use project-local node_modules/.bin if it is the first result (not _npx)", () =>
      Effect.gen(function* () {
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

        const config = yield* ClaudeCode.Config.pipe(Effect.provide(CommandExecutorTest));

        // プロジェクトローカルの node_modules/.bin はユーザーが意図的に PATH を通している可能性があるので使用する
        expect(config.claudeCodeExecutablePath).toBe("/some/project/node_modules/.bin/claude");
        expect(config.claudeCodeVersion).toStrictEqual({
          major: 2,
          minor: 0,
          patch: 30,
        });
      }).pipe(Effect.provide(testPlatformLayer())),
    );
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

  describe("runSkillsDirectly feature flag", () => {
    it("should be false when claudeCodeVersion is null", () => {
      const features = ClaudeCode.getAvailableFeatures(null);
      expect(features.runSkillsDirectly).toBe(false);
    });

    it("should be false when claudeCodeVersion is v2.0.76", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 2,
        minor: 0,
        patch: 76,
      });
      expect(features.runSkillsDirectly).toBe(false);
    });

    it("should be true when claudeCodeVersion is v2.0.77", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 2,
        minor: 0,
        patch: 77,
      });
      expect(features.runSkillsDirectly).toBe(true);
    });

    it("should be true when claudeCodeVersion is v2.0.80 (greater than v2.0.77)", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 2,
        minor: 0,
        patch: 80,
      });
      expect(features.runSkillsDirectly).toBe(true);
    });

    it("should be true when claudeCodeVersion is v2.1.0", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 2,
        minor: 1,
        patch: 0,
      });
      expect(features.runSkillsDirectly).toBe(true);
    });

    it("should be true when claudeCodeVersion is v2.1.5 (greater than v2.1.0)", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 2,
        minor: 1,
        patch: 5,
      });
      expect(features.runSkillsDirectly).toBe(true);
    });

    it("should be false when claudeCodeVersion is v1.x.x (lower major version)", () => {
      const features = ClaudeCode.getAvailableFeatures({
        major: 1,
        minor: 0,
        patch: 200,
      });
      expect(features.runSkillsDirectly).toBe(false);
    });
  });
});
