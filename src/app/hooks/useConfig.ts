import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { honoClient } from "../../lib/api/client";
import { configQuery } from "../../lib/api/queries";
import type { UserConfig } from "../../server/lib/config/config";

export const useConfig = () => {
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery({
    queryKey: configQuery.queryKey,
    queryFn: configQuery.queryFn,
  });
  const updateConfigMutation = useMutation({
    mutationFn: async (config: UserConfig) => {
      const response = await honoClient.api.config.$put({
        json: config,
      });
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: configQuery.queryKey,
      });
    },
  });

  return {
    config: data?.config,
    updateConfig: useCallback(
      (config: UserConfig) => {
        updateConfigMutation.mutate(config);
      },
      [updateConfigMutation],
    ),
  } as const;
};
