import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { honoClient } from "@/lib/api/client";
import { pendingQuestionRequestsQuery } from "@/lib/api/queries";
import type { QuestionResponse } from "@/types/question";

export const useQuestionRequests = (sessionId?: string) => {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    ...pendingQuestionRequestsQuery,
    enabled: sessionId !== undefined,
  });

  const questionRequests = data?.questionRequests ?? [];

  // The latest pending request for this session (should be at most 1)
  const currentQuestionRequest = questionRequests.find((r) => r.sessionId === sessionId) ?? null;

  const handleQuestionResponse = useCallback(
    async (response: QuestionResponse) => {
      try {
        const apiResponse = await honoClient.api["claude-code"]["question-response"].$post({
          json: response,
        });

        if (!apiResponse.ok) {
          throw new Error("Failed to send question response");
        }

        // Consume the approval notification now that the user has responded
        if (sessionId !== undefined && sessionId !== "") {
          await honoClient.api.notifications[":sessionId"].consume.$post({
            param: { sessionId },
            json: { types: ["question_asked"] },
          });
        }

        // Invalidate to refetch (the request should now be gone)
        await queryClient.invalidateQueries({
          queryKey: pendingQuestionRequestsQuery.queryKey,
        });
      } catch (error) {
        console.error("Error sending question response:", error);
        toast.error("Failed to send question response");
      }
    },
    [sessionId, queryClient],
  );

  return {
    currentQuestionRequest,
    onQuestionResponse: handleQuestionResponse,
  };
};
