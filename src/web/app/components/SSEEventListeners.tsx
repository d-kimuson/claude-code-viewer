import { useQueryClient } from "@tanstack/react-query";
import type { FC, PropsWithChildren } from "react";
import { useServerEventListener } from "@/lib/sse/hook/useServerEventListener";
import {
  notificationsQuery,
  pendingPermissionRequestsQuery,
  pendingQuestionRequestsQuery,
  projectDetailQuery,
  sessionDetailQuery,
} from "@/web/lib/api/queries";

export const SSEEventListeners: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = useQueryClient();

  useServerEventListener("sessionListChanged", (event) => {
    void queryClient.invalidateQueries({
      queryKey: projectDetailQuery(event.projectId).queryKey,
    });
  });

  useServerEventListener("sessionChanged", (event) => {
    void queryClient.invalidateQueries({
      queryKey: sessionDetailQuery(event.projectId, event.sessionId).queryKey,
    });
  });

  useServerEventListener("agentSessionChanged", (event) => {
    // Invalidate the specific agent-session query for this agentSessionId
    // New query key pattern: ["projects", projectId, "agent-sessions", agentId]
    void queryClient.invalidateQueries({
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

  useServerEventListener("permissionRequested", () => {
    void queryClient.invalidateQueries({
      queryKey: pendingPermissionRequestsQuery.queryKey,
    });
  });

  useServerEventListener("permissionResolved", () => {
    void queryClient.invalidateQueries({
      queryKey: pendingPermissionRequestsQuery.queryKey,
    });
  });

  useServerEventListener("questionRequested", () => {
    void queryClient.invalidateQueries({
      queryKey: pendingQuestionRequestsQuery.queryKey,
    });
  });

  useServerEventListener("questionResolved", () => {
    void queryClient.invalidateQueries({
      queryKey: pendingQuestionRequestsQuery.queryKey,
    });
  });

  useServerEventListener("notificationCreated", () => {
    void queryClient.invalidateQueries({
      queryKey: notificationsQuery.queryKey,
    });
  });

  useServerEventListener("notificationConsumed", () => {
    void queryClient.invalidateQueries({
      queryKey: notificationsQuery.queryKey,
    });
  });

  return <>{children}</>;
};
