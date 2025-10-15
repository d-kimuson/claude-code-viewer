"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import type { FC, PropsWithChildren } from "react";
import { projectDetailQuery, sessionDetailQuery } from "../../lib/api/queries";
import { useServerEventListener } from "../../lib/sse/hook/useServerEventListener";
import { aliveTasksAtom } from "../projects/[projectId]/sessions/[sessionId]/store/aliveTasksAtom";

export const SSEEventListeners: FC<PropsWithChildren> = ({ children }) => {
  const queryClient = useQueryClient();
  const setAliveTasks = useSetAtom(aliveTasksAtom);

  useServerEventListener("sessionListChanged", async (event) => {
    // invalidate session list
    await queryClient.invalidateQueries({
      queryKey: projectDetailQuery(event.projectId).queryKey,
    });
  });

  useServerEventListener("sessionChanged", async (event) => {
    // invalidate session detail
    await queryClient.invalidateQueries({
      queryKey: sessionDetailQuery(event.projectId, event.sessionId).queryKey,
    });
  });

  useServerEventListener("taskChanged", async ({ aliveTasks }) => {
    setAliveTasks(aliveTasks);
  });

  return <>{children}</>;
};
