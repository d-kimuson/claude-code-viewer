import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useMemo } from "react";
import { aliveTasksQuery } from "../../../../../../lib/api/queries";
import { aliveTasksAtom } from "../store/aliveTasksAtom";

export const useAliveTask = (sessionId: string) => {
  const [aliveTasks, setAliveTasks] = useAtom(aliveTasksAtom);

  useQuery({
    queryKey: aliveTasksQuery.queryKey,
    queryFn: async () => {
      const { aliveTasks } = await aliveTasksQuery.queryFn();
      setAliveTasks(aliveTasks);
      return aliveTasks;
    },
    refetchOnReconnect: true,
  });

  const taskInfo = useMemo(() => {
    const aliveTask = aliveTasks.find((task) => task.sessionId === sessionId);

    return {
      aliveTask: aliveTasks.find((task) => task.sessionId === sessionId),
      isRunningTask: aliveTask?.status === "running",
      isPausedTask: aliveTask?.status === "paused",
    } as const;
  }, [aliveTasks, sessionId]);

  return taskInfo;
};
