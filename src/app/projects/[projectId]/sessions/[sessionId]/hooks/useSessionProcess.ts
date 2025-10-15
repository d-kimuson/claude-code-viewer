import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { sessionProcessesAtom } from "../store/sessionProcessesAtom";

export const useSessionProcess = () => {
  const sessionProcesses = useAtomValue(sessionProcessesAtom);

  const getSessionProcess = useCallback(
    (sessionId: string) => {
      const targetProcess = sessionProcesses.find(
        (process) => process.sessionId === sessionId,
      );

      return targetProcess;
    },
    [sessionProcesses],
  );

  return {
    sessionProcesses,
    getSessionProcess,
  };
};
