import type { UserConfig } from "@claude-code-viewer/backend/types";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { honoClient } from "../../lib/api/client";
import { configQuery } from "../../lib/api/queries";

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
  });

  return {
    config: data?.config,
    updateConfig: useCallback(
      (
        config: UserConfig,
        callbacks?: {
          onSuccess: () => void | Promise<void>;
        },
      ) => {
        updateConfigMutation.mutate(config, {
          onSuccess: async () => {
            await queryClient.invalidateQueries({
              queryKey: configQuery.queryKey,
            });

            await callbacks?.onSuccess?.();
          },
        });
      },
      [updateConfigMutation, queryClient],
    ),
  } as const;
};
