import { useMutation, useQuery } from "@tanstack/react-query";
import { honoClient } from "@/lib/api/client";
import {
  gitBranchesQuery,
  gitCommitsQuery,
  gitFilteredBranchesQuery,
  gitFilteredCommitsQuery,
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

export const useFilteredGitBranches = (projectId: string) => {
  return useQuery({
    queryKey: gitFilteredBranchesQuery(projectId).queryKey,
    queryFn: gitFilteredBranchesQuery(projectId).queryFn,
    staleTime: 30000, // 30 seconds
  });
};

export const useFilteredGitCommits = (projectId: string) => {
  return useQuery({
    queryKey: gitFilteredCommitsQuery(projectId).queryKey,
    queryFn: gitFilteredCommitsQuery(projectId).queryFn,
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

export const useCommitFiles = (projectId: string) => {
  return useMutation({
    mutationFn: async ({
      files,
      message,
    }: {
      files: string[];
      message: string;
    }) => {
      const response = await honoClient.api.projects[
        ":projectId"
      ].git.commit.$post({
        param: { projectId },
        json: { projectId, files, message },
      });

      if (!response.ok) {
        throw new Error(`Failed to commit files: ${response.statusText}`);
      }

      return response.json();
    },
  });
};

export const usePushCommits = (projectId: string) => {
  return useMutation({
    mutationFn: async () => {
      const response = await honoClient.api.projects[
        ":projectId"
      ].git.push.$post({
        param: { projectId },
        json: { projectId },
      });

      if (!response.ok) {
        throw new Error(`Failed to push commits: ${response.statusText}`);
      }

      return response.json();
    },
  });
};

export const useCommitAndPush = (projectId: string) => {
  return useMutation({
    mutationFn: async ({
      files,
      message,
    }: {
      files: string[];
      message: string;
    }) => {
      const response = await honoClient.api.projects[":projectId"].git[
        "commit-and-push"
      ].$post({
        param: { projectId },
        json: { projectId, files, message },
      });

      if (!response.ok) {
        throw new Error(`Failed to commit and push: ${response.statusText}`);
      }

      return response.json();
    },
  });
};
