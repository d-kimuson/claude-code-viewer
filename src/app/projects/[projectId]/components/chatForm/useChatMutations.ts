import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { honoClient } from "../../../../../lib/api/client";

export const useNewChatMutation = (
  projectId: string,
  onSuccess?: () => void,
) => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (options: { message: string }) => {
      const response = await honoClient.api.projects[":projectId"][
        "new-session"
      ].$post(
        {
          param: { projectId },
          json: { message: options.message },
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
        `/projects/${projectId}/sessions/${response.sessionId}#message-${response.userMessageId}`,
      );
    },
  });
};

export const useResumeChatMutation = (projectId: string, sessionId: string) => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (options: { message: string }) => {
      const response = await honoClient.api.projects[":projectId"].sessions[
        ":sessionId"
      ].resume.$post(
        {
          param: { projectId, sessionId },
          json: { resumeMessage: options.message },
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
      if (sessionId !== response.sessionId) {
        router.push(
          `/projects/${projectId}/sessions/${response.sessionId}#message-${response.userMessageId}`,
        );
      }
    },
  });
};
