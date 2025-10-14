import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { projectDetailQuery } from "../../../../lib/api/queries";

export const useProject = (projectId: string) => {
  return useSuspenseInfiniteQuery({
    queryKey: ["projects", projectId],
    queryFn: async ({ pageParam }) => {
      return await projectDetailQuery(projectId, pageParam).queryFn();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnReconnect: true,
  });
};
