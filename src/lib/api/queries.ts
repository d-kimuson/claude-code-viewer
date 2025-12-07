import type { DirectoryListingResult } from "../../server/core/file-system/functions/getDirectoryListing";
import type { FileCompletionResult } from "../../server/core/file-system/functions/getFileCompletion";
import { honoClient } from "./client";

export const authCheckQuery = {
  queryKey: ["auth", "check"],
  queryFn: async () => {
    const response = await honoClient.api.auth.check.$get();
    return await response.json();
  },
} as const;

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

export const directoryListingQuery = (
  currentPath?: string,
  showHidden?: boolean,
) =>
  ({
    queryKey: ["directory-listing", currentPath, showHidden],
    queryFn: async (): Promise<DirectoryListingResult> => {
      const response = await honoClient.api.fs["directory-browser"].$get({
        query: {
          ...(currentPath ? { currentPath } : {}),
          ...(showHidden !== undefined
            ? { showHidden: showHidden.toString() }
            : {}),
        },
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

export const gitCurrentRevisionsQuery = (projectId: string) =>
  ({
    queryKey: ["git", "current-revisions", projectId],
    queryFn: async () => {
      const response = await honoClient.api.projects[":projectId"].git[
        "current-revisions"
      ].$get({
        param: { projectId },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch current revisions: ${response.statusText}`,
        );
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

export const systemVersionQuery = {
  queryKey: ["version"],
  queryFn: async () => {
    const response = await honoClient.api.version.$get();

    if (!response.ok) {
      throw new Error(`Failed to fetch system version: ${response.statusText}`);
    }

    return await response.json();
  },
} as const;

export const claudeCodeMetaQuery = {
  queryKey: ["cc", "meta"],
  queryFn: async () => {
    const response = await honoClient.api.cc.meta.$get();

    if (!response.ok) {
      throw new Error(
        `Failed to fetch system features: ${response.statusText}`,
      );
    }

    return await response.json();
  },
} as const;

export const claudeCodeFeaturesQuery = {
  queryKey: ["cc", "features"],
  queryFn: async () => {
    const response = await honoClient.api.cc.features.$get();

    if (!response.ok) {
      throw new Error(
        `Failed to fetch claude code features: ${response.statusText}`,
      );
    }

    return await response.json();
  },
} as const;

export const schedulerJobsQuery = {
  queryKey: ["scheduler", "jobs"],
  queryFn: async () => {
    const response = await honoClient.api.scheduler.jobs.$get();

    if (!response.ok) {
      throw new Error(`Failed to fetch scheduler jobs: ${response.statusText}`);
    }

    return await response.json();
  },
} as const;

export const featureFlagsQuery = {
  queryKey: ["flags"],
  queryFn: async () => {
    const response = await honoClient.api.flags.$get();

    if (!response.ok) {
      throw new Error(`Failed to fetch feature flags: ${response.statusText}`);
    }

    return await response.json();
  },
} as const;

export const agentSessionQuery = (projectId: string, agentId: string) =>
  ({
    queryKey: ["projects", projectId, "agent-sessions", agentId],
    queryFn: async () => {
      const response = await honoClient.api.projects[":projectId"][
        "agent-sessions"
      ][":agentId"].$get({
        param: { projectId, agentId },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch agent session: ${response.statusText}`,
        );
      }

      return await response.json();
    },
  }) as const;

export const searchQuery = (
  query: string,
  options?: { limit?: number; projectId?: string },
) =>
  ({
    queryKey: ["search", query, options?.limit, options?.projectId],
    queryFn: async () => {
      const response = await honoClient.api.search.$get({
        query: {
          q: query,
          ...(options?.limit !== undefined
            ? { limit: options.limit.toString() }
            : {}),
          ...(options?.projectId ? { projectId: options.projectId } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to search: ${response.statusText}`);
      }

      return await response.json();
    },
  }) as const;
