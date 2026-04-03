import { useSuspenseQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { type FC, type PropsWithChildren, useEffect } from "react";
import { useServerEventListener } from "@/lib/sse/hook/useServerEventListener";
import { sessionProcessesQuery } from "@/web/lib/api/queries";
import {
  abortedByUserSessionIdsAtom,
  sessionProcessesAtom,
} from "../projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";

export const SyncSessionProcess: FC<PropsWithChildren> = ({ children }) => {
  const setSessionProcesses = useSetAtom(sessionProcessesAtom);
  const setAbortedByUserSessionIds = useSetAtom(abortedByUserSessionIdsAtom);
  const { data } = useSuspenseQuery({
    queryKey: sessionProcessesQuery.queryKey,
    queryFn: sessionProcessesQuery.queryFn,
  });

  useServerEventListener("sessionProcessChanged", ({ processes, abortedByUser }) => {
    setSessionProcesses(processes);

    if (abortedByUser !== undefined) {
      setAbortedByUserSessionIds(
        (prev: Set<string>) => new Set([...prev, abortedByUser.sessionId]),
      );
    }

    // Clean up abort tracking for sessions that are running again (resumed)
    const runningSessionIds = new Set(
      processes.filter((p) => p.status === "running").map((p) => p.sessionId),
    );
    if (runningSessionIds.size > 0) {
      setAbortedByUserSessionIds((prev: Set<string>) => {
        const hasOverlap = [...prev].some((id) => runningSessionIds.has(id));
        if (!hasOverlap) return prev;
        return new Set([...prev].filter((id) => !runningSessionIds.has(id)));
      });
    }
  });

  useEffect(() => {
    setSessionProcesses(data.processes);
  }, [data, setSessionProcesses]);

  return <>{children}</>;
};
