import { Trans, useLingui } from "@lingui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  CircleHelpIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { Loading } from "../../../../../../../components/Loading";
import { mcpListQuery } from "../../../../../../../lib/api/queries";

export const McpTab: FC<{ projectId: string }> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const { i18n } = useLingui();

  const {
    data: mcpData,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: mcpListQuery(projectId).queryKey,
    queryFn: mcpListQuery(projectId).queryFn,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
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
            <Trans id="mcp.title" />
          </h2>
          <Button
            onClick={handleReload}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={isLoading || isFetching}
            title={i18n._("Reload MCP servers")}
          >
            <RefreshCwIcon
              className={`w-3 h-3 ${isLoading || isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">
              <Loading />
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500">
            <Trans
              id="mcp.error.load_failed"
              values={{ error: (error as Error).message }}
            />
          </div>
        )}

        {mcpData && mcpData.servers.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            <Trans id="mcp.no.servers" />
          </div>
        )}

        {mcpData && mcpData.servers.length > 0 && (
          <div className="space-y-3">
            {mcpData.servers.map((server) => (
              <div
                key={server.name}
                className={`p-3 bg-sidebar-accent/50 rounded-md border ${
                  server.status === "failed"
                    ? "border-red-500/50 bg-red-500/10"
                    : "border-sidebar-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {server.status === "connected" && (
                        <CheckCircle2Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {server.status === "failed" && (
                        <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      {server.status === "unknown" && (
                        <CircleHelpIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <h3 className="text-sm font-medium text-sidebar-foreground truncate">
                        {server.name}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono break-all pl-6">
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
