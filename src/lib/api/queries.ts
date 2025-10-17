import type { DirectoryListingResult } from "../../server/core/file-system/functions/getDirectoryListing";
import type { FileCompletionResult } from "../../server/core/file-system/functions/getFileCompletion";
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

export const directoryListingQuery = (currentPath?: string) =>
  ({
    queryKey: ["directory-listing", currentPath],
    queryFn: async (): Promise<DirectoryListingResult> => {
      const response = await honoClient.api.fs["directory-browser"].$get({
        query: currentPath ? { currentPath } : {},
      });

      if (!response.ok) {
        throw new Error("Failed to fetch directory listing");
      }

      return await response.json();
    },
  }) as const;

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

export const latestSessionQuery = (projectId: string) =>
  ({
    queryKey: ["projects", projectId, "latest-session"],
    queryFn: async () => {
      const response = await honoClient.api.projects[":projectId"][
        "latest-session"
      ].$get({
        param: { projectId },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch latest session: ${response.statusText}`,
        );
      }

      return response.json();
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

      return await response.json();
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

export const sessionProcessesQuery = {
  queryKey: ["sessionProcesses"],
  queryFn: async () => {
    const response = await honoClient.api.cc["session-processes"].$get({});

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

export const mcpListQuery = (projectId: string) =>
  ({
    queryKey: ["mcp", "list", projectId],
    queryFn: async () => {
      const response = await honoClient.api.projects[
        ":projectId"
      ].mcp.list.$get({
        param: { projectId },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch MCP list: ${response.statusText}`);
      }

      return await response.json();
    },
  }) as const;

export const fileCompletionQuery = (projectId: string, basePath: string) =>
  ({
    queryKey: ["file-completion", projectId, basePath],
    queryFn: async (): Promise<FileCompletionResult> => {
      const response = await honoClient.api.fs["file-completion"].$get({
        query: { basePath, projectId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch file completion");
      }

      return await response.json();
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
