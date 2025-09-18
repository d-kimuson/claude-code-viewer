import { useMutation, useQuery } from "@tanstack/react-query";
import { honoClient } from "@/lib/api/client";
import {
  gitBranchesQuery,
  gitCommitsQuery,
} from "../../../../../../lib/api/queries";

export const useGitBranches = (projectId: string) => {
  return useQuery({
    queryKey: gitBranchesQuery(projectId).queryKey,
    queryFn: gitBranchesQuery(projectId).queryFn,
    staleTime: 30000, // 30 seconds
  });
};

export const useGitCommits = (projectId: string) => {
  return useQuery({
    queryKey: gitCommitsQuery(projectId).queryKey,
    queryFn: gitCommitsQuery(projectId).queryFn,
    staleTime: 30000, // 30 seconds
  });
};

export const useGitDiff = () => {
  return useMutation({
    mutationFn: async ({
      projectId,
      fromRef,
      toRef,
    }: {
      projectId: string;
      fromRef: string;
      toRef: string;
    }) => {
      const response = await honoClient.api.projects[
        ":projectId"
      ].git.diff.$post({
        param: { projectId },
        json: { fromRef, toRef },
      });

      if (!response.ok) {
        throw new Error(`Failed to get diff: ${response.statusText}`);
      }

      return response.json();
    },
  });
};
