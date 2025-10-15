import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { projectDetailQuery } from "../../../../lib/api/queries";

export const useProject = (projectId: string) => {
  return useSuspenseInfiniteQuery({
    queryKey: projectDetailQuery(projectId).queryKey,
    queryFn: async ({ pageParam }) => {
      const result = await projectDetailQuery(projectId, pageParam).queryFn();
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnReconnect: true,
  });
};
