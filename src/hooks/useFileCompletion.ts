import { useQuery } from "@tanstack/react-query";
import { honoClient } from "../lib/api/client";

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
    queryKey: ["file-completion", projectId, basePath],
    queryFn: async (): Promise<FileCompletionResult> => {
      const response = await honoClient.api.projects[":projectId"][
        "file-completion"
      ].$get({
        param: { projectId },
        query: { basePath },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch file completion");
      }

      return response.json();
    },
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};
