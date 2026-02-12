import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { honoClient } from "@/lib/api/client";
import { gitCurrentRevisionsQuery } from "../../../../../../lib/api/queries";

export const useGitCurrentRevisions = (projectId: string) => {
  return useQuery({
    queryKey: gitCurrentRevisionsQuery(projectId).queryKey,
    queryFn: gitCurrentRevisionsQuery(projectId).queryFn,
    staleTime: 30000, // 30 seconds
  });
};

export const useGitCurrentRevisionsSuspense = (projectId: string) => {
  return useSuspenseQuery({
    queryKey: gitCurrentRevisionsQuery(projectId).queryKey,
    queryFn: gitCurrentRevisionsQuery(projectId).queryFn,
    staleTime: 30000,
  });
};

export const useGitBranches = (projectId: string) => {
  return useQuery({
    queryKey: ["git", "branches", projectId],
    queryFn: async () => {
      const response = await honoClient.api.projects[
        ":projectId"
      ].git.branches.$get({
        param: { projectId },
      });

      if (!response.ok) {
        throw new Error(`Failed to get branches: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 30000,
  });
};

export const useGitCheckout = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (branchName: string) => {
      const response = await honoClient.api.projects[
        ":projectId"
      ].git.checkout.$post({
        param: { projectId },
        json: { branchName },
      });

      if (!response.ok) {
        throw new Error(`Failed to checkout: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["git", "branches", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: gitCurrentRevisionsQuery(projectId).queryKey,
      });
    },
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
        json: { files, message },
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
        json: { files, message },
      });

      if (!response.ok) {
        throw new Error(`Failed to commit and push: ${response.statusText}`);
      }

      return response.json();
    },
  });
};
