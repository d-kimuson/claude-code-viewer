import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { honoClient } from "../../../../../lib/api/client";
import type { MessageInput } from "./ChatInput";

export const useCreateSessionProcessMutation = (
  projectId: string,
  onSuccess?: () => void,
) => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (options: {
      input: MessageInput;
      baseSessionId?: string;
    }) => {
      const response = await honoClient.api.cc["session-processes"].$post(
        {
          json: {
            projectId,
            baseSessionId: options.baseSessionId,
            input: options.input,
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
        to: "/projects/$projectId/session",
        params: {
          projectId,
        },
        search: (prev) => ({
          ...prev,
          sessionId: response.sessionProcess.sessionId,
        }),
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
      input: MessageInput;
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
            input: options.input,
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
