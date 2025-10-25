import { z } from "zod";

// Concurrency policy (for cron jobs only)
export const concurrencyPolicySchema = z.enum(["skip", "run"]);

// Schedule type discriminated union
export const cronScheduleSchema = z.object({
  type: z.literal("cron"),
  expression: z.string(),
  concurrencyPolicy: concurrencyPolicySchema,
});

export const reservedScheduleSchema = z.object({
  type: z.literal("reserved"),
  reservedExecutionTime: z.iso.datetime(),
});

export const scheduleSchema = z.discriminatedUnion("type", [
  cronScheduleSchema,
  reservedScheduleSchema,
]);

// Message configuration
export const messageConfigSchema = z.object({
  content: z.string(),
  projectId: z.string(),
  baseSessionId: z.string().nullable(),
});

// Job status
export const jobStatusSchema = z.enum(["success", "failed"]);

// Scheduler job
export const schedulerJobSchema = z.object({
  id: z.string(),
  name: z.string(),
  schedule: scheduleSchema,
  message: messageConfigSchema,
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  lastRunAt: z.string().datetime().nullable(),
  lastRunStatus: jobStatusSchema.nullable(),
});

// Config file schema
export const schedulerConfigSchema = z.object({
  jobs: z.array(schedulerJobSchema),
});

// Type exports
export type CronSchedule = z.infer<typeof cronScheduleSchema>;
export type ReservedSchedule = z.infer<typeof reservedScheduleSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type MessageConfig = z.infer<typeof messageConfigSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type ConcurrencyPolicy = z.infer<typeof concurrencyPolicySchema>;
export type SchedulerJob = z.infer<typeof schedulerJobSchema>;
export type SchedulerConfig = z.infer<typeof schedulerConfigSchema>;

// New job creation schema (without runtime fields)
export const newSchedulerJobSchema = schedulerJobSchema
  .omit({
    id: true,
    createdAt: true,
    lastRunAt: true,
    lastRunStatus: true,
  })
  .extend({
    enabled: z.boolean().default(true),
  });

export type NewSchedulerJob = z.infer<typeof newSchedulerJobSchema>;

// Job update schema (partial fields)
export const updateSchedulerJobSchema = schedulerJobSchema.partial().pick({
  name: true,
  schedule: true,
  message: true,
  enabled: true,
});

export type UpdateSchedulerJob = z.infer<typeof updateSchedulerJobSchema>;
