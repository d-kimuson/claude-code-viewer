import { useConfig } from "@/web/app/hooks/useConfig";

export const useIsSubscriptionMode = (): boolean => {
  const { config } = useConfig();
  return config?.usageMode === "subscription";
};
