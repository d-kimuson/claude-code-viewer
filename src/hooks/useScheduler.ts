import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  NewSchedulerJob,
  SchedulerJob,
  UpdateSchedulerJob,
} from "@/server/core/scheduler/schema";
import { honoClient } from "../lib/api/client";

/**
 * Query key factory for scheduler-related queries
 */
const schedulerKeys = {
  all: ["scheduler"] as const,
  jobs: () => [...schedulerKeys.all, "jobs"] as const,
  job: (id: string) => [...schedulerKeys.all, "job", id] as const,
};

/**
 * Hook to fetch all scheduler jobs
 *
 * @example
 * const { data: jobs, isLoading, error } = useSchedulerJobs();
 *
 * @returns Query result containing array of SchedulerJob
 */
export const useSchedulerJobs = () => {
  return useQuery({
    queryKey: schedulerKeys.jobs(),
    queryFn: async (): Promise<SchedulerJob[]> => {
      const response = await honoClient.api.scheduler.jobs.$get();
      if (!response.ok) {
        throw new Error("Failed to fetch scheduler jobs");
      }
      return response.json();
    },
  });
};

/**
 * Hook to create a new scheduler job
 *
 * @example
 * const createJob = useCreateSchedulerJob();
 *
 * createJob.mutate({
 *   name: "Daily Report",
 *   schedule: { type: "cron", expression: "0 9 * * *" },
 *   message: {
 *     content: "Generate daily report",
 *     projectId: "project-123",
 *     baseSessionId: null,
 *   },
 *   enabled: true,
 *   concurrencyPolicy: "skip",
 * });
 *
 * @returns Mutation result for creating a scheduler job
 */
export const useCreateSchedulerJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newJob: NewSchedulerJob): Promise<SchedulerJob> => {
      const response = await honoClient.api.scheduler.jobs.$post({
        json: newJob,
      });

      if (!response.ok) {
        throw new Error("Failed to create scheduler job");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate jobs list to refetch
      void queryClient.invalidateQueries({ queryKey: schedulerKeys.jobs() });
    },
  });
};

/**
 * Hook to update an existing scheduler job
 *
 * @example
 * const updateJob = useUpdateSchedulerJob();
 *
 * updateJob.mutate({
 *   id: "job-123",
 *   updates: {
 *     enabled: false,
 *     name: "Updated Job Name",
 *   },
 * });
 *
 * @returns Mutation result for updating a scheduler job
 */
export const useUpdateSchedulerJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateSchedulerJob;
    }): Promise<SchedulerJob> => {
      // TODO: Hono RPC type inference for nested routes (.route()) with $patch is incomplete
      // This causes a TypeScript error even though the runtime behavior is correct
      // Possible solutions:
      // 1. Move scheduler routes directly to main route.ts instead of using .route()
      // 2. Wait for Hono RPC to improve type inference for nested routes
      // 3. Use type assertion (currently forbidden by CLAUDE.md)
      const response = await honoClient.api.scheduler.jobs[":id"].$patch({
        param: { id },
        json: updates,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Job not found");
        }
        throw new Error("Failed to update scheduler job");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate specific job and jobs list
      void queryClient.invalidateQueries({
        queryKey: schedulerKeys.job(data.id),
      });
      void queryClient.invalidateQueries({ queryKey: schedulerKeys.jobs() });
    },
  });
};

/**
 * Hook to delete a scheduler job
 *
 * @example
 * const deleteJob = useDeleteSchedulerJob();
 *
 * deleteJob.mutate("job-123", {
 *   onSuccess: () => {
 *     console.log("Job deleted successfully");
 *   },
 * });
 *
 * @returns Mutation result for deleting a scheduler job
 */
export const useDeleteSchedulerJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: true }> => {
      const response = await honoClient.api.scheduler.jobs[":id"].$delete({
        param: { id },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Job not found");
        }
        throw new Error("Failed to delete scheduler job");
      }

      return response.json();
    },
    onSuccess: (_, deletedId) => {
      // Invalidate specific job and jobs list
      void queryClient.invalidateQueries({
        queryKey: schedulerKeys.job(deletedId),
      });
      void queryClient.invalidateQueries({ queryKey: schedulerKeys.jobs() });
    },
  });
};

// Export types for external use
export type { SchedulerJob, NewSchedulerJob, UpdateSchedulerJob };
