import { useSuspenseQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { type FC, type PropsWithChildren, useEffect } from "react";
import { sessionProcessesQuery } from "../../lib/api/queries";
import { useServerEventListener } from "../../lib/sse/hook/useServerEventListener";
import { sessionProcessesAtom } from "../projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";

export const SyncSessionProcess: FC<PropsWithChildren> = ({ children }) => {
  const setSessionProcesses = useSetAtom(sessionProcessesAtom);
  const { data } = useSuspenseQuery({
    queryKey: sessionProcessesQuery.queryKey,
    queryFn: sessionProcessesQuery.queryFn,
  });

  useServerEventListener("sessionProcessChanged", async ({ processes }) => {
    setSessionProcesses(processes);
  });

  useEffect(() => {
    setSessionProcesses(data.processes);
  }, [data, setSessionProcesses]);

  return <>{children}</>;
};
