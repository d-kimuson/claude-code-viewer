import { useQueryClient } from "@tanstack/react-query";
import type { FC, PropsWithChildren } from "react";
import {
  notificationsQuery,
  pendingPermissionRequestsQuery,
  pendingQuestionRequestsQuery,
  projectDetailQuery,
  sessionDetailQuery,
} from "../../lib/api/queries";
import { useServerEventListener } from "../../lib/sse/hook/useServerEventListener";

export const SSEEventListeners: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = useQueryClient();

  useServerEventListener("sessionListChanged", async (event) => {
    await queryClient.invalidateQueries({
      queryKey: projectDetailQuery(event.projectId).queryKey,
    });
  });

  useServerEventListener("sessionChanged", async (event) => {
    await queryClient.invalidateQueries({
      queryKey: sessionDetailQuery(event.projectId, event.sessionId).queryKey,
    });
  });

  useServerEventListener("agentSessionChanged", async (event) => {
    // Invalidate the specific agent-session query for this agentSessionId
    // New query key pattern: ["projects", projectId, "agent-sessions", agentId]
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return (
          Array.isArray(queryKey) &&
          queryKey[0] === "projects" &&
          queryKey[1] === event.projectId &&
          queryKey[2] === "agent-sessions" &&
          queryKey[3] === event.agentSessionId
        );
      },
    });
  });

  useServerEventListener("permissionRequested", async () => {
    await queryClient.invalidateQueries({
      queryKey: pendingPermissionRequestsQuery.queryKey,
    });
  });

  useServerEventListener("permissionResolved", async () => {
    await queryClient.invalidateQueries({
      queryKey: pendingPermissionRequestsQuery.queryKey,
    });
  });

  useServerEventListener("questionRequested", async () => {
    await queryClient.invalidateQueries({
      queryKey: pendingQuestionRequestsQuery.queryKey,
    });
  });

  useServerEventListener("questionResolved", async () => {
    await queryClient.invalidateQueries({
      queryKey: pendingQuestionRequestsQuery.queryKey,
    });
  });

  useServerEventListener("notificationCreated", async () => {
    await queryClient.invalidateQueries({
      queryKey: notificationsQuery.queryKey,
    });
  });

  useServerEventListener("notificationConsumed", async () => {
    await queryClient.invalidateQueries({
      queryKey: notificationsQuery.queryKey,
    });
  });

  return <>{children}</>;
};
