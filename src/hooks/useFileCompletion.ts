import { useQuery } from "@tanstack/react-query";
import { fileCompletionQuery } from "../lib/api/queries";

export type FileCompletionEntry = {
  name: string;
  type: "file" | "directory";
  path: string;
};

export type FileCompletionResult = {
  entries: FileCompletionEntry[];
  basePath: string;
  projectPath: string;
};

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
