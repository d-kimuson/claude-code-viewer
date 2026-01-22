import { useMutation, useQueryClient } from "@tanstack/react-query";
import { honoClient } from "@/lib/api/client";
import { projectDetailQuery } from "@/lib/api/queries";

/**
 * Hook to delete a session
 *
 * @example
 * const deleteSession = useDeleteSession();
 *
 * deleteSession.mutate(
 *   { projectId: "project-123", sessionId: "session-456" },
 *   {
 *     onSuccess: () => {
 *       console.log("Session deleted successfully");
 *     },
 *   }
 * );
 *
 * @returns Mutation result for deleting a session
 */
export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      sessionId,
    }: {
      projectId: string;
      sessionId: string;
    }): Promise<{ success: true }> => {
      const response = await honoClient.api.projects[":projectId"].sessions[
        ":sessionId"
      ].$delete({
        param: { projectId, sessionId },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Session not found");
        }
        throw new Error("Failed to delete session");
      }

      return response.json();
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate project detail query to refresh the session list
      void queryClient.invalidateQueries({
        queryKey: projectDetailQuery(projectId).queryKey,
      });
    },
  });
};
