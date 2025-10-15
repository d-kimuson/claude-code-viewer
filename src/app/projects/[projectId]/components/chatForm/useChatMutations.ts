import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { honoClient } from "../../../../../lib/api/client";

export const useCreateSessionProcessMutation = (
  projectId: string,
  onSuccess?: () => void,
) => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (options: {
      message: string;
      baseSessionId?: string;
    }) => {
      const response = await honoClient.api.cc["session-processes"].$post(
        {
          json: {
            projectId,
            baseSessionId: options.baseSessionId,
            message: options.message,
          },
        },
        {
          init: {
            signal: AbortSignal.timeout(20 * 1000),
          },
        },
      );

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
    onSuccess: async (response) => {
      onSuccess?.();
      router.push(
        `/projects/${projectId}/sessions/${response.sessionProcess.sessionId}`,
      );
    },
  });
};

export const useContinueSessionProcessMutation = (
  projectId: string,
  baseSessionId: string,
) => {
  return useMutation({
    mutationFn: async (options: {
      message: string;
      sessionProcessId: string;
    }) => {
      const response = await honoClient.api.cc["session-processes"][
        ":sessionProcessId"
      ].continue.$post(
        {
          param: { sessionProcessId: options.sessionProcessId },
          json: {
            projectId: projectId,
            baseSessionId: baseSessionId,
            continueMessage: options.message,
          },
        },
        {
          init: {
            signal: AbortSignal.timeout(20 * 1000),
          },
        },
      );

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
  });
};
