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
      const { ccOptions, forkSession, ...input } = options.input;

      const getBaseSession = ():
        | undefined
        | { type: "fork"; sessionId: string }
        | { type: "resume"; sessionId: string } => {
        if (!options.baseSessionId) return undefined;
        const sessionType = forkSession !== false ? "fork" : "resume";
        return { type: sessionType, sessionId: options.baseSessionId };
      };

      const response = await honoClient.api["claude-code"][
        "session-processes"
      ].$post(
        {
          json: {
            projectId,
            baseSession: getBaseSession(),
            input,
            ccOptions,
          },
        },
        {
          init: {
            signal: AbortSignal.timeout(60 * 1000),
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
      const response = await honoClient.api["claude-code"]["session-processes"][
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
            signal: AbortSignal.timeout(60 * 1000),
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
