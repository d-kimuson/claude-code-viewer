import { describe, expect, test } from "vitest";
import type { SchedulerJob } from "../schema";
import { calculateReservedDelay, shouldExecuteJob } from "./Job";

describe("shouldExecuteJob", () => {
  test("returns false when job is disabled", () => {
    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: {
        type: "cron",
        expression: "* * * * *",
        concurrencyPolicy: "skip",
      },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: false,
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(shouldExecuteJob(job, new Date())).toBe(false);
  });

  test("returns true for cron job when enabled", () => {
    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: {
        type: "cron",
        expression: "* * * * *",
        concurrencyPolicy: "skip",
      },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(shouldExecuteJob(job, new Date())).toBe(true);
  });

  test("returns false for reserved job that has already run", () => {
    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: {
        type: "reserved",
        reservedExecutionTime: "2025-10-25T00:01:00Z",
      },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: "2025-10-25T00:01:00Z",
      lastRunStatus: "success",
    };

    expect(shouldExecuteJob(job, new Date())).toBe(false);
  });

  test("returns false for reserved job when scheduled time has not arrived", () => {
    const now = new Date("2025-10-25T00:00:30Z");

    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: {
        type: "reserved",
        reservedExecutionTime: "2025-10-25T00:01:00Z",
      },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(shouldExecuteJob(job, now)).toBe(false);
  });

  test("returns true for reserved job when scheduled time has arrived", () => {
    const now = new Date("2025-10-25T00:01:01Z");

    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: {
        type: "reserved",
        reservedExecutionTime: "2025-10-25T00:01:00Z",
      },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(shouldExecuteJob(job, now)).toBe(true);
  });
});

describe("calculateReservedDelay", () => {
  test("calculates delay correctly for future scheduled time", () => {
    const now = new Date("2025-10-25T00:00:30Z");

    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: {
        type: "reserved",
        reservedExecutionTime: "2025-10-25T00:01:00Z",
      },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    const delay = calculateReservedDelay(job, now);
    expect(delay).toBe(30000);
  });

  test("returns 0 for past scheduled time", () => {
    const now = new Date("2025-10-25T00:02:00Z");

    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: {
        type: "reserved",
        reservedExecutionTime: "2025-10-25T00:01:00Z",
      },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    const delay = calculateReservedDelay(job, now);
    expect(delay).toBe(0);
  });

  test("throws error for non-reserved schedule type", () => {
    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: {
        type: "cron",
        expression: "* * * * *",
        concurrencyPolicy: "skip",
      },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(() => calculateReservedDelay(job, new Date())).toThrow(
      "Job schedule type must be reserved",
    );
  });
});
