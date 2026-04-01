import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { honoClient } from "@/lib/api/client";
import { pendingPermissionRequestsQuery } from "@/lib/api/queries";
import type { PermissionResponse } from "@/types/permissions";

export const usePermissionRequests = (sessionId?: string) => {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    ...pendingPermissionRequestsQuery,
    enabled: sessionId !== undefined,
  });

  const permissionRequests = data?.permissionRequests ?? [];

  // The latest pending request for this session (should be at most 1)
  const currentPermissionRequest =
    permissionRequests.find((r) => r.sessionId === sessionId) ?? null;

  const handlePermissionResponse = useCallback(
    async (response: PermissionResponse): Promise<void> => {
      try {
        const apiResponse = await honoClient.api["claude-code"]["permission-response"].$post({
          json: response,
        });

        if (!apiResponse.ok) {
          throw new Error("Failed to send permission response");
        }

        // Consume the approval notification now that the user has responded
        if (sessionId !== undefined && sessionId !== "") {
          await honoClient.api.notifications[":sessionId"].consume.$post({
            param: { sessionId },
            json: { types: ["permission_requested"] },
          });
        }

        // Invalidate to refetch (the request should now be gone)
        await queryClient.invalidateQueries({
          queryKey: pendingPermissionRequestsQuery.queryKey,
        });
      } catch (error) {
        console.error("Error sending permission response:", error);
        toast.error("Failed to send permission response");
      }
    },
    [sessionId, queryClient],
  );

  return {
    currentPermissionRequest,
    onPermissionResponse: handlePermissionResponse,
  };
};
