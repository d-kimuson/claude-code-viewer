import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  addVirtualMessage,
  removeVirtualMessage,
} from "@/lib/virtual-messages/virtualMessageStore";
import { honoClient } from "@/web/lib/api/client";
import type { MessageInput } from "./ChatInput";

export const useCreateSessionProcessMutation = (projectId: string, onSuccess?: () => void) => {
  const navigate = useNavigate({ from: "/projects/$projectId/session" });

  return useMutation({
    mutationFn: async (options: { input: MessageInput; baseSessionId?: string }) => {
      const { ccOptions, ...input } = options.input;
      const sessionId = options.baseSessionId ?? crypto.randomUUID();

      // Add virtual message to store before navigation
      addVirtualMessage({
        sessionId,
        projectId,
        userMessage: input.text,
        sentAt: new Date().toISOString(),
      });

      // Navigate immediately (before API response)
      void navigate({
        to: "/projects/$projectId/session",
        params: { projectId },
        search: { sessionId },
      });
      onSuccess?.();

      // Then fire API call
      const getBaseSession = (): undefined | { type: "resume"; sessionId: string } => {
        if (options.baseSessionId === undefined || options.baseSessionId === "") return undefined;
        return { type: "resume", sessionId: options.baseSessionId };
      };

      try {
        const response = await honoClient.api["claude-code"]["session-processes"].$post(
          {
            json: {
              projectId,
              sessionId:
                options.baseSessionId !== undefined && options.baseSessionId !== ""
                  ? undefined
                  : sessionId,
              baseSession: getBaseSession(),
              input,
              ccOptions,
            },
          },
          {
            init: {
              signal: AbortSignal.timeout(10 * 1000),
            },
          },
        );

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        removeVirtualMessage(sessionId);
        throw error;
      }
    },
  });
};

export const useContinueSessionProcessMutation = (projectId: string, baseSessionId: string) => {
  return useMutation({
    mutationFn: async (options: { input: MessageInput; sessionProcessId: string }) => {
      // Add virtual message to store for continue
      addVirtualMessage({
        sessionId: baseSessionId,
        projectId,
        userMessage: options.input.text,
        sentAt: new Date().toISOString(),
      });

      try {
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
              signal: AbortSignal.timeout(10 * 1000),
            },
          },
        );

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        removeVirtualMessage(baseSessionId);
        throw error;
      }
    },
  });
};
