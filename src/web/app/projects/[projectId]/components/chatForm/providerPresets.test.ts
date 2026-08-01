import { describe, expect, test } from "vitest";
import {
  anthropicBaseUrlEnvName,
  applyProviderPreset,
  providerPresetConfig,
  providerPresets,
} from "./providerPresets";

describe("providerPresets", () => {
  test("includes the MiniMax text models and regional Anthropic endpoints", () => {
    expect(providerPresetConfig.providerName).toBe("MiniMax");
    expect(providerPresetConfig.defaultModel).toBe("MiniMax-M3");
    expect(providerPresetConfig.models.map((model) => model.id)).toEqual([
      "MiniMax-M3",
      "MiniMax-M2.7",
    ]);
    expect(providerPresetConfig.models[0]).toMatchObject({
      contextWindow: 1000000,
      inputModalities: ["text", "image", "video"],
      thinking: ["adaptive", "disabled"],
      pricingUsdPerMillionTokens: { input: 0.6, output: 2.4, cache_read: 0.12 },
    });
    expect(providerPresetConfig.models[1]).toMatchObject({
      contextWindow: 204800,
      inputModalities: ["text"],
      thinking: ["always_on"],
      pricingUsdPerMillionTokens: {
        input: 0.3,
        output: 1.2,
        cache_read: 0.06,
        cache_write: 0.375,
      },
    });
    expect(providerPresetConfig.endpoints.map((endpoint) => endpoint.anthropicBaseUrl)).toEqual([
      "https://api.minimax.io/anthropic",
      "https://api.minimaxi.com/anthropic",
    ]);
  });

  test("applies the selected preset without discarding existing options", () => {
    const chinaPreset = providerPresets.find((preset) => preset.id === "minimax-cn_zh");
    expect(chinaPreset).toBeDefined();

    if (chinaPreset === undefined) {
      throw new Error("MiniMax China preset is missing");
    }

    const result = applyProviderPreset(
      {
        env: { EXISTING_FLAG: "1" },
        maxTurns: 3,
      },
      chinaPreset,
    );

    expect(result).toEqual({
      model: "MiniMax-M3",
      env: {
        EXISTING_FLAG: "1",
        [anthropicBaseUrlEnvName]: "https://api.minimaxi.com/anthropic",
      },
      maxTurns: 3,
    });
  });
});
