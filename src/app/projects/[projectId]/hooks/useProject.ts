import { useSuspenseQuery } from "@tanstack/react-query";
import { projectDetailQuery } from "../../../../lib/api/queries";

export const useProject = (projectId: string) => {
  return useSuspenseQuery({
    queryKey: projectDetailQuery(projectId).queryKey,
    queryFn: projectDetailQuery(projectId).queryFn,
    refetchOnReconnect: true,
  });
};
