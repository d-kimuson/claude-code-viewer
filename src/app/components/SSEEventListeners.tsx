import { useQueryClient } from "@tanstack/react-query";
import type { FC, PropsWithChildren } from "react";
import { projectDetailQuery, sessionDetailQuery } from "../../lib/api/queries";
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
    // Invalidate all agent-session queries for this project
    // Since we don't know which prompt corresponds to the changed file,
    // we invalidate all agent-session queries for the project
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        // Match pattern: ["projects", projectId, "sessions", *, "agent-session", *]
        return (
          Array.isArray(queryKey) &&
          queryKey[0] === "projects" &&
          queryKey[1] === event.projectId &&
          queryKey[4] === "agent-session"
        );
      },
    });
  });

  return <>{children}</>;
};
