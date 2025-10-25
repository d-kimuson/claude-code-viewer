import { useSuspenseQuery } from "@tanstack/react-query";
import { sessionDetailQuery } from "../../../../../../lib/api/queries";

export const useSessionQuery = (projectId: string, sessionId: string) => {
  return useSuspenseQuery({
    queryKey: sessionDetailQuery(projectId, sessionId).queryKey,
    queryFn: sessionDetailQuery(projectId, sessionId).queryFn,
  });
};
