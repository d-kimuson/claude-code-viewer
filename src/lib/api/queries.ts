import type { FileCompletionResult } from "../../server/service/file-completion/getFileCompletion";
import { honoClient } from "./client";

export const projectListQuery = {
  queryKey: ["projects"],
  queryFn: async () => {
    const response = await honoClient.api.projects.$get({
      param: {},
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    return await response.json();
  },
} as const;

export const projectDetailQuery = (projectId: string, cursor?: string) =>
  ({
    queryKey: ["projects", projectId],
    queryFn: async () => {
      const response = await honoClient.api.projects[":projectId"].$get({
        param: { projectId },
        query: { cursor },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.statusText}`);
      }

      return await response.json();
    },
  }) as const;

export const sessionDetailQuery = (projectId: string, sessionId: string) =>
  ({
    queryKey: ["projects", projectId, "sessions", sessionId],
    queryFn: async () => {
      const response = await honoClient.api.projects[":projectId"].sessions[
        ":sessionId"
      ].$get({
        param: {
          projectId,
          sessionId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
      }

      return response.json();
    },
  }) as const;

export const claudeCommandsQuery = (projectId: string) =>
  ({
    queryKey: ["claude-commands", projectId],
    queryFn: async () => {
      const response = await honoClient.api.projects[":projectId"][
        "claude-commands"
      ].$get({
        param: { projectId },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch claude commands: ${response.statusText}`,
        );
      }

      return await response.json();
    },
  }) as const;

export const aliveTasksQuery = {
  queryKey: ["aliveTasks"],
  queryFn: async () => {
    const response = await honoClient.api.tasks.alive.$get({});

    if (!response.ok) {
      throw new Error(`Failed to fetch alive tasks: ${response.statusText}`);
    }

    return await response.json();
  },
} as const;

export const gitBranchesQuery = (projectId: string) =>
  ({
    queryKey: ["git", "branches", projectId],
    queryFn: async () => {
      const response = await honoClient.api.projects[
        ":projectId"
      ].git.branches.$get({
        param: { projectId },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.statusText}`);
      }

      return await response.json();
    },
  }) as const;

export const gitCommitsQuery = (projectId: string) =>
  ({
    queryKey: ["git", "commits", projectId],
    queryFn: async () => {
      const response = await honoClient.api.projects[
        ":projectId"
      ].git.commits.$get({
        param: { projectId },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch commits: ${response.statusText}`);
      }

      return await response.json();
    },
  }) as const;

export const mcpListQuery = {
  queryKey: ["mcp", "list"],
  queryFn: async () => {
    const response = await honoClient.api.mcp.list.$get();

    if (!response.ok) {
      throw new Error(`Failed to fetch MCP list: ${response.statusText}`);
    }

    return await response.json();
  },
} as const;

export const fileCompletionQuery = (projectId: string, basePath: string) =>
  ({
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
  }) as const;

export const configQuery = {
  queryKey: ["config"],
  queryFn: async () => {
    const response = await honoClient.api.config.$get();

    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.statusText}`);
    }

    return await response.json();
  },
} as const;
