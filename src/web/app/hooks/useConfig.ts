import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { type AuthState, authAtom } from "@/lib/auth/store/authAtom";
import { defaultUserConfig, type UserConfig } from "@/lib/config/userConfig";
import { honoClient } from "@/web/lib/api/client";
import { configQuery } from "@/web/lib/api/queries";

export const canFetchConfig = (authState: AuthState) =>
  authState.checked && (!authState.authEnabled || authState.authenticated);

export const useConfig = () => {
  const queryClient = useQueryClient();
  const authState = useAtomValue(authAtom);
  const shouldFetch = canFetchConfig(authState);

  const { data } = useQuery<{ config: UserConfig }>({
    queryKey: configQuery.queryKey,
    queryFn: configQuery.queryFn,
    enabled: shouldFetch,
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
    config: shouldFetch ? (data?.config ?? defaultUserConfig) : defaultUserConfig,
    updateConfig: useCallback(
      (
        config: UserConfig,
        callbacks?: {
          onSuccess: () => void | Promise<void>;
        },
      ) => {
        if (!shouldFetch) {
          return;
        }

        updateConfigMutation.mutate(config, {
          onSuccess: () => {
            void (async () => {
              await queryClient.invalidateQueries({
                queryKey: configQuery.queryKey,
              });

              await callbacks?.onSuccess?.();
            })();
          },
        });
      },
      [updateConfigMutation, queryClient, shouldFetch],
    ),
  } as const;
};
