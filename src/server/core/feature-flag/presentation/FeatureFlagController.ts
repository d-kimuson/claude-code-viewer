import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ClaudeCodeService } from "../../claude-code/services/ClaudeCodeService";
import type { Flag } from "../models/flag";

const LayerImpl = Effect.gen(function* () {
  const claudeCodeService = yield* ClaudeCodeService;

  const getFlags = () =>
    Effect.gen(function* () {
      const claudeCodeFeatures =
        yield* claudeCodeService.getAvailableFeatures();

      return {
        response: {
          flags: [
            {
              name: "tool-approval",
              enabled: claudeCodeFeatures.canUseTool,
            },
            {
              name: "agent-sdk",
              enabled: claudeCodeFeatures.agentSdk,
            },
            {
              name: "sidechain-separation",
              enabled: claudeCodeFeatures.sidechainSeparation,
            },
            {
              name: "uuid-on-sdk-message",
              enabled: claudeCodeFeatures.uuidOnSDKMessage,
            },
            {
              name: "run-skills-directly",
              enabled: claudeCodeFeatures.runSkillsDirectly,
            },
          ] satisfies Flag[],
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    getFlags,
  };
});

export type IFeatureFlagController = InferEffect<typeof LayerImpl>;
export class FeatureFlagController extends Context.Tag("FeatureFlagController")<
  FeatureFlagController,
  IFeatureFlagController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
