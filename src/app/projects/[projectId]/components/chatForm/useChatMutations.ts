import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { honoClient } from "../../../../../lib/api/client";

export const useCreateSessionProcessMutation = (
  projectId: string,
  onSuccess?: () => void,
) => {
  const navigate = useNavigate();

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
      navigate({
        to: "/projects/$projectId/sessions/$sessionId",
        params: {
          projectId: projectId,
          sessionId: response.sessionProcess.sessionId,
        },
      });
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
