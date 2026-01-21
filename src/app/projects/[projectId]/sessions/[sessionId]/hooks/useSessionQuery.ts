import { useSuspenseQuery } from "@tanstack/react-query";
import { sessionDetailQuery } from "../../../../../../lib/api/queries";

export const useSessionQuery = (projectId: string, sessionId: string) => {
  return useSuspenseQuery({
    queryKey: sessionDetailQuery(projectId, sessionId).queryKey,
    queryFn: sessionDetailQuery(projectId, sessionId).queryFn,
    // Fallback polling in case SSE connection is lost
    // This ensures users don't need to manually refresh the page
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
};
