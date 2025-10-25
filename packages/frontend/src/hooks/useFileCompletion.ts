import { useQuery } from "@tanstack/react-query";
import { fileCompletionQuery } from "../lib/api/queries";

export const useFileCompletion = (
  projectId: string,
  basePath: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: fileCompletionQuery(projectId, basePath).queryKey,
    queryFn: fileCompletionQuery(projectId, basePath).queryFn,
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};
