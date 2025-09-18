import { useSuspenseQuery } from "@tanstack/react-query";
import { projectListQuery } from "../../../lib/api/queries";

export const useProjects = () => {
  return useSuspenseQuery({
    queryKey: projectListQuery.queryKey,
    queryFn: projectListQuery.queryFn,
  });
};
