import { Trans } from "@lingui/react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { useState } from "react";
import type { ProjectGroup } from "@/lib/sidebar-layout/groupProjects";
import { resolveSessionTitle } from "@/web/app/projects/[projectId]/services/firstCommandToTitle";
import { sessionProcessesAtom } from "@/web/app/projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import { projectDetailQuery } from "@/web/lib/api/queries";
import { cn } from "@/web/utils";

type Request = { projectId: string; cursor: string | undefined; worktreeName: string | null };
export const GroupSessions = ({
  group,
  currentProjectId,
  currentSessionId,
  onSessionSelect,
}: {
  group: ProjectGroup;
  currentProjectId?: string | undefined;
  currentSessionId?: string | undefined;
  onSessionSelect?: (() => void) | undefined;
}) => {
  const [requests, setRequests] = useState<Request[]>(() =>
    group.members.map((member) => ({
      projectId: member.project.id,
      cursor: undefined,
      worktreeName: member.worktreeName,
    })),
  );
  const results = useQueries({
    queries: requests.map((request) => ({
      queryKey: ["projects", request.projectId, "tree", request.cursor],
      queryFn: projectDetailQuery(request.projectId, request.cursor).queryFn,
    })),
  });
  const processes = useAtomValue(sessionProcessesAtom);
  const error = results.find((result) => result.isError)?.error;
  const sessions = results
    .flatMap((result, index) => {
      const request = requests[index];
      if (request === undefined || result.data === undefined) return [];
      return result.data.sessions.map((session) => ({ session, request }));
    })
    .sort(
      (a, b) =>
        new Date(b.session.lastModifiedAt).getTime() - new Date(a.session.lastModifiedAt).getTime(),
    );
  const next = results.flatMap((result, index) => {
    const request = requests[index];
    const cursor = result.data?.nextCursor;
    return request !== undefined &&
      cursor !== undefined &&
      cursor !== null &&
      !requests.some(
        (existing) => existing.projectId === request.projectId && existing.cursor === cursor,
      )
      ? [{ ...request, cursor }]
      : [];
  });
  return (
    <div className="ml-5 border-l border-sidebar-border pl-2 pb-2">
      {error !== undefined && error !== null && (
        <p role="alert" className="text-destructive text-xs p-2">
          {error.message}
        </p>
      )}
      {results.some((result) => result.isPending) && (
        <p className="p-2 text-xs text-muted-foreground">
          <Trans id="common.loading" />
        </p>
      )}
      {sessions.map(({ session, request }) => {
        const status = processes.find((process) => process.sessionId === session.id)?.status;
        return (
          <Link
            key={`${request.projectId}:${session.id}`}
            to="/projects/$projectId/session"
            params={{ projectId: request.projectId }}
            search={{ tab: "projects", sessionId: session.id }}
            onClick={onSessionSelect}
            aria-current={
              request.projectId === currentProjectId && session.id === currentSessionId
                ? "page"
                : undefined
            }
            className={cn(
              "flex gap-2 items-center rounded px-2 py-2 text-sm hover:bg-sidebar-accent",
              request.projectId === currentProjectId &&
                session.id === currentSessionId &&
                "bg-sidebar-accent font-medium",
            )}
          >
            <span className="min-w-0 flex-1 truncate">
              {resolveSessionTitle(
                session.meta.customTitle,
                session.meta.firstUserMessage,
                session.id,
              )}
            </span>
            {request.worktreeName !== null && (
              <Badge
                variant="outline"
                className="max-w-24 truncate text-xs"
                title={request.worktreeName}
              >
                {request.worktreeName}
              </Badge>
            )}
            {(status === "running" || status === "paused") && (
              <Badge
                variant={status === "running" ? "default" : "secondary"}
                className={
                  status === "running" ? "bg-green-500 text-white" : "bg-yellow-500 text-white"
                }
              >
                {status === "running" ? (
                  <Trans id="session.status.running" />
                ) : (
                  <Trans id="session.status.paused" />
                )}
              </Badge>
            )}
          </Link>
        );
      })}
      {next.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          disabled={results.some((result) => result.isFetching)}
          onClick={() => setRequests((previous) => [...previous, ...next])}
        >
          <Trans id="sessions.load.more" />
        </Button>
      )}
    </div>
  );
};
