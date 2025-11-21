import { CommandExecutor, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { EnvService } from "../../platform/services/EnvService";
import * as ClaudeCode from "./ClaudeCode";

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
