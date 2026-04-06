import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  addVirtualMessage,
  removeVirtualMessage,
} from "@/lib/virtual-messages/virtualMessageStore";
import { honoClient } from "@/web/lib/api/client";
import { sessionDetailQuery } from "@/web/lib/api/queries";
import type { MessageInput } from "./ChatInput";

/** Safely extract conversation count from TanStack Query cached data without type assertions. */
const extractConversationCount = (data: unknown): number | undefined => {
  if (data === null || data === undefined || typeof data !== "object") return undefined;
  if (!("session" in data)) return undefined;
  const { session } = data;
  if (session === null || session === undefined || typeof session !== "object") return undefined;
  if (!("conversations" in session)) return undefined;
  const { conversations } = session;
  if (!Array.isArray(conversations)) return undefined;
  return conversations.length;
};

export const useCreateSessionProcessMutation = (projectId: string, onSuccess?: () => void) => {
  const navigate = useNavigate({ from: "/projects/$projectId/session" });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: { input: MessageInput; baseSessionId?: string }) => {
      const { ccOptions, ...input } = options.input;
      const baseSessionId = options.baseSessionId;
      const resume = baseSessionId !== undefined && baseSessionId !== "";
      const sessionId = resume ? baseSessionId : crypto.randomUUID();

      // Snapshot conversation count for resume case (new sessions have no prior conversations)
      const conversationCount = resume
        ? extractConversationCount(
            queryClient.getQueryData(sessionDetailQuery(projectId, sessionId).queryKey),
          )
        : undefined;

      // Add virtual message to store before navigation
      addVirtualMessage({
        sessionId,
        projectId,
        userMessage: input.text,
        sentAt: new Date().toISOString(),
        isNewSession: !resume,
        conversationCount,
      });

      // Invalidate session detail query so it re-runs and picks up the VM
      void queryClient.invalidateQueries({
        queryKey: sessionDetailQuery(projectId, sessionId).queryKey,
      });

      // Navigate immediately (before API response)
      void navigate({
        to: "/projects/$projectId/session",
        params: { projectId },
        search: { sessionId },
      });
      onSuccess?.();

      // Then fire API call
      try {
        const response = await honoClient.api["claude-code"]["session-processes"].$post(
          {
            json: {
              projectId,
              sessionId,
              resume,
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

export const useEnqueueMessageMutation = (projectId: string, baseSessionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: { input: MessageInput; sessionProcessId: string }) => {
      // Snapshot conversation count for robust virtual message removal
      const conversationCount = extractConversationCount(
        queryClient.getQueryData(sessionDetailQuery(projectId, baseSessionId).queryKey),
      );

      // Add virtual message for optimistic UI
      addVirtualMessage({
        sessionId: baseSessionId,
        projectId,
        userMessage: options.input.text,
        sentAt: new Date().toISOString(),
        isNewSession: false,
        conversationCount,
      });

      // Invalidate session detail query so it re-runs and picks up the VM
      void queryClient.invalidateQueries({
        queryKey: sessionDetailQuery(projectId, baseSessionId).queryKey,
      });

      try {
        const response = await honoClient.api["claude-code"]["session-processes"][
          ":sessionProcessId"
        ].enqueue.$post(
          {
            param: { sessionProcessId: options.sessionProcessId },
            json: {
              projectId: projectId,
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

        return await response.json();
      } catch (error) {
        removeVirtualMessage(baseSessionId);
        throw error;
      }
    },
  });
};

export const useContinueSessionProcessMutation = (projectId: string, baseSessionId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: { input: MessageInput; sessionProcessId: string }) => {
      // Snapshot conversation count before creating VM for robust removal detection
      const conversationCount = extractConversationCount(
        queryClient.getQueryData(sessionDetailQuery(projectId, baseSessionId).queryKey),
      );

      // Add virtual message to store for continue
      addVirtualMessage({
        sessionId: baseSessionId,
        projectId,
        userMessage: options.input.text,
        sentAt: new Date().toISOString(),
        isNewSession: false,
        conversationCount,
      });

      // Invalidate session detail query so it re-runs and picks up the VM
      void queryClient.invalidateQueries({
        queryKey: sessionDetailQuery(projectId, baseSessionId).queryKey,
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
