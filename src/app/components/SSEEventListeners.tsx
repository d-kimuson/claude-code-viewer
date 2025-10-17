"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import type { FC, PropsWithChildren } from "react";
import { projectDetailQuery, sessionDetailQuery } from "../../lib/api/queries";
import { useServerEventListener } from "../../lib/sse/hook/useServerEventListener";
import { sessionProcessesAtom } from "../projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";

export const SSEEventListeners: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = useQueryClient();
  const setSessionProcesses = useSetAtom(sessionProcessesAtom);

  useServerEventListener("sessionListChanged", async (event) => {
    await queryClient.invalidateQueries({
      queryKey: projectDetailQuery(event.projectId).queryKey,
    });
  });

  useServerEventListener("sessionChanged", async (event) => {
    await queryClient.invalidateQueries({
      queryKey: sessionDetailQuery(event.projectId, event.sessionId).queryKey,
    });
  });

  useServerEventListener("sessionProcessChanged", async ({ processes }) => {
    setSessionProcesses(processes);
  });

  return <>{children}</>;
};
