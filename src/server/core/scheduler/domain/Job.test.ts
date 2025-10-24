import { describe, expect, test } from "vitest";
import type { SchedulerJob } from "../schema";
import { calculateFixedDelay, shouldExecuteJob } from "./Job";

describe("shouldExecuteJob", () => {
  test("returns false when job is disabled", () => {
    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: { type: "cron", expression: "* * * * *" },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: false,
      concurrencyPolicy: "skip",
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
      schedule: { type: "cron", expression: "* * * * *" },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      concurrencyPolicy: "skip",
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(shouldExecuteJob(job, new Date())).toBe(true);
  });

  test("returns false for oneTime fixed job that has already run", () => {
    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: { type: "fixed", delayMs: 60000, oneTime: true },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      concurrencyPolicy: "skip",
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: "2025-10-25T00:01:00Z",
      lastRunStatus: "success",
    };

    expect(shouldExecuteJob(job, new Date())).toBe(false);
  });

  test("returns false for oneTime fixed job when scheduled time has not arrived", () => {
    const createdAt = new Date("2025-10-25T00:00:00Z");
    const now = new Date("2025-10-25T00:00:30Z");

    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: { type: "fixed", delayMs: 60000, oneTime: true },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      concurrencyPolicy: "skip",
      createdAt: createdAt.toISOString(),
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(shouldExecuteJob(job, now)).toBe(false);
  });

  test("returns true for oneTime fixed job when scheduled time has arrived", () => {
    const createdAt = new Date("2025-10-25T00:00:00Z");
    const now = new Date("2025-10-25T00:01:01Z");

    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: { type: "fixed", delayMs: 60000, oneTime: true },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      concurrencyPolicy: "skip",
      createdAt: createdAt.toISOString(),
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(shouldExecuteJob(job, now)).toBe(true);
  });

  test("returns true for recurring fixed job", () => {
    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: { type: "fixed", delayMs: 60000, oneTime: false },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      concurrencyPolicy: "skip",
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(shouldExecuteJob(job, new Date())).toBe(true);
  });
});

describe("calculateFixedDelay", () => {
  test("calculates delay correctly for future scheduled time", () => {
    const createdAt = new Date("2025-10-25T00:00:00Z");
    const now = new Date("2025-10-25T00:00:30Z");

    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: { type: "fixed", delayMs: 60000, oneTime: true },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      concurrencyPolicy: "skip",
      createdAt: createdAt.toISOString(),
      lastRunAt: null,
      lastRunStatus: null,
    };

    const delay = calculateFixedDelay(job, now);
    expect(delay).toBe(30000);
  });

  test("returns 0 for past scheduled time", () => {
    const createdAt = new Date("2025-10-25T00:00:00Z");
    const now = new Date("2025-10-25T00:02:00Z");

    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: { type: "fixed", delayMs: 60000, oneTime: true },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      concurrencyPolicy: "skip",
      createdAt: createdAt.toISOString(),
      lastRunAt: null,
      lastRunStatus: null,
    };

    const delay = calculateFixedDelay(job, now);
    expect(delay).toBe(0);
  });

  test("throws error for non-fixed schedule type", () => {
    const job: SchedulerJob = {
      id: "test-job",
      name: "Test Job",
      schedule: { type: "cron", expression: "* * * * *" },
      message: { content: "test", projectId: "proj-1", baseSessionId: null },
      enabled: true,
      concurrencyPolicy: "skip",
      createdAt: "2025-10-25T00:00:00Z",
      lastRunAt: null,
      lastRunStatus: null,
    };

    expect(() => calculateFixedDelay(job, new Date())).toThrow(
      "Job schedule type must be fixed",
    );
  });
});
