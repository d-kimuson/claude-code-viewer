"use client";

import { useSetAtom } from "jotai";
import { type FC, type PropsWithChildren, useEffect } from "react";
import type { PublicSessionProcess } from "../../types/session-process";
import { sessionProcessesAtom } from "../projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";

export const SyncSessionProcess: FC<
  PropsWithChildren<{ initProcesses: PublicSessionProcess[] }>
> = ({ children, initProcesses }) => {
  const setSessionProcesses = useSetAtom(sessionProcessesAtom);

  useEffect(() => {
    setSessionProcesses(initProcesses);
  }, [initProcesses, setSessionProcesses]);

  return <>{children}</>;
};
