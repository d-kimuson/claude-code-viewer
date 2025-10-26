import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { featureFlagsQuery } from "../lib/api/queries";
import type { FlagName } from "../server/core/feature-flag/models/flag";

export const useFeatureFlags = () => {
  const { data } = useSuspenseQuery({
    queryKey: featureFlagsQuery.queryKey,
    queryFn: featureFlagsQuery.queryFn,
  });

  const enabledFlags = useMemo(() => {
    return new Set(
      data.flags.filter((flag) => flag.enabled).map((flag) => flag.name),
    );
  }, [data.flags]);

  const isFlagEnabled = useCallback(
    (flagName: FlagName) => {
      return enabledFlags.has(flagName);
    },
    [enabledFlags],
  );

  return {
    flags: data.flags,
    isFlagEnabled,
  } as const;
};
