"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { mcpListQuery } from "../../../../../../../lib/api/queries";

export const McpTab: FC<{ projectId: string }> = ({ projectId }) => {
  const queryClient = useQueryClient();

  const {
    data: mcpData,
    isLoading,
    error,
  } = useQuery({
    queryKey: mcpListQuery(projectId).queryKey,
    queryFn: mcpListQuery(projectId).queryFn,
  });

  const handleReload = () => {
    queryClient.invalidateQueries({
      queryKey: mcpListQuery(projectId).queryKey,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-sidebar-foreground">
            MCP Servers
          </h2>
          <Button
            onClick={handleReload}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={isLoading}
            title="Reload MCP servers"
          >
            <RefreshCwIcon
              className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500">
            Failed to load MCP servers: {(error as Error).message}
          </div>
        )}

        {mcpData && mcpData.servers.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No MCP servers found
          </div>
        )}

        {mcpData && mcpData.servers.length > 0 && (
          <div className="space-y-3">
            {mcpData.servers.map((server) => (
              <div
                key={server.name}
                className="p-3 bg-sidebar-accent/50 rounded-md border border-sidebar-border"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-sidebar-foreground truncate">
                      {server.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                      {server.command}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
