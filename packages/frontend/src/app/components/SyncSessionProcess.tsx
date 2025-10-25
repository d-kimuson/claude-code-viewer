import type { PublicSessionProcess } from "@claude-code-viewer/shared/types/session-process";
import { useSetAtom } from "jotai";
import { type FC, type PropsWithChildren, useEffect } from "react";
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
