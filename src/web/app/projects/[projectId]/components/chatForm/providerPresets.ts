import type { CCOptionsSchema } from "@/server/core/claude-code/schema";

export const anthropicBaseUrlEnvName = "ANTHROPIC_BASE_URL";

export const providerPresetConfig = {
  providerName: "MiniMax",
  defaultModel: "MiniMax-M3",
  models: [
    {
      id: "MiniMax-M3",
      contextWindow: 1000000,
      pricingUsdPerMillionTokens: {
        input: 0.6,
        output: 2.4,
        cache_read: 0.12,
        cache_write: null,
      },
      inputModalities: ["text", "image", "video"],
      thinking: ["adaptive", "disabled"],
    },
    {
      id: "MiniMax-M2.7",
      contextWindow: 204800,
      pricingUsdPerMillionTokens: {
        input: 0.3,
        output: 1.2,
        cache_read: 0.06,
        cache_write: 0.375,
      },
      inputModalities: ["text"],
      thinking: ["always_on"],
    },
  ],
  endpoints: [
    {
      region: "global_en",
      label: "Global",
      anthropicBaseUrl: "https://api.minimax.io/anthropic",
      openaiBaseUrl: "https://api.minimax.io/v1",
      docsRoot: "https://platform.minimax.io/docs",
    },
    {
      region: "cn_zh",
      label: "China",
      anthropicBaseUrl: "https://api.minimaxi.com/anthropic",
      openaiBaseUrl: "https://api.minimaxi.com/v1",
      docsRoot: "https://platform.minimaxi.com/docs",
    },
  ],
} as const;

export type ProviderPreset = {
  id: string;
  label: string;
  model: string;
  anthropicBaseUrl: string;
};

export const providerPresets: ProviderPreset[] = providerPresetConfig.endpoints.map((endpoint) => ({
  id: `${providerPresetConfig.providerName.toLowerCase()}-${endpoint.region}`,
  label: `${providerPresetConfig.providerName} ${endpoint.label}`,
  model: providerPresetConfig.defaultModel,
  anthropicBaseUrl: endpoint.anthropicBaseUrl,
}));

export const applyProviderPreset = (
  options: CCOptionsSchema | undefined,
  preset: ProviderPreset,
): CCOptionsSchema => ({
  ...options,
  model: preset.model,
  env: {
    ...options?.env,
    [anthropicBaseUrlEnvName]: preset.anthropicBaseUrl,
  },
});
