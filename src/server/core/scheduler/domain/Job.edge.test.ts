import { describe, expect, test } from "vitest";
import type { SchedulerJob } from "../schema.ts";
import { calculateReservedDelay, shouldExecuteJob } from "./Job.ts";

const makeReservedJob = (
  reservedExecutionTime: string,
  lastRunStatus: SchedulerJob["lastRunStatus"] = null,
): SchedulerJob => ({
  id: "test-job",
  name: "Test Job",
  schedule: {
    type: "reserved",
    reservedExecutionTime,
  },
  message: {
    content: "test",
    projectId: "proj-1",
    sessionId: "00000000-0000-4000-8000-000000000001",
    resume: false,
  },
  enabled: true,
  createdAt: "2025-10-25T00:00:00Z",
  lastRunAt: lastRunStatus !== null ? "2025-10-25T00:01:00Z" : null,
  lastRunStatus,
});

const makeCronJob = (enabled: boolean): SchedulerJob => ({
  id: "cron-job",
  name: "Cron Job",
  schedule: {
    type: "cron",
    expression: "0 * * * *",
    concurrencyPolicy: "skip",
  },
  message: {
    content: "run",
    projectId: "proj-1",
    sessionId: "00000000-0000-4000-8000-000000000002",
    resume: false,
  },
  enabled,
  createdAt: "2025-10-25T00:00:00Z",
  lastRunAt: null,
  lastRunStatus: null,
});

describe("shouldExecuteJob - boundary conditions", () => {
  test("returns true when now is exactly equal to scheduledTime (boundary)", () => {
    const scheduledTime = "2025-10-25T00:01:00Z";
    const now = new Date(scheduledTime); // exactly the scheduled time

    const job = makeReservedJob(scheduledTime);
    // now >= scheduledTime should be true (equal boundary)
    expect(shouldExecuteJob(job, now)).toBe(true);
  });

  test("returns false for reserved job with failed lastRunStatus (already ran, failed)", () => {
    const now = new Date("2025-10-25T00:05:00Z");
    const job = makeReservedJob("2025-10-25T00:01:00Z", "failed");
    // lastRunStatus !== null → already ran (even if failed), should not re-run
    expect(shouldExecuteJob(job, now)).toBe(false);
  });

  test("disabled cron job always returns false regardless of time", () => {
    const job = makeCronJob(false);
    expect(shouldExecuteJob(job, new Date("2025-10-25T00:01:00Z"))).toBe(false);
  });

  test("enabled cron job always returns true regardless of time", () => {
    const job = makeCronJob(true);
    // cron jobs should always be considered ready to execute
    expect(shouldExecuteJob(job, new Date("2025-10-25T00:00:00Z"))).toBe(true);
    expect(shouldExecuteJob(job, new Date("2030-01-01T00:00:00Z"))).toBe(true);
  });
});

describe("calculateReservedDelay - boundary conditions", () => {
  test("returns exactly 0 when now is exactly at scheduled time", () => {
    const scheduledTime = "2025-10-25T00:01:00Z";
    const now = new Date(scheduledTime);
    const job = makeReservedJob(scheduledTime);

    expect(calculateReservedDelay(job, now)).toBe(0);
  });

  test("returns 1 ms when now is 1 ms before scheduled time", () => {
    const scheduledTime = "2025-10-25T00:01:00.000Z";
    const now = new Date("2025-10-25T00:00:59.999Z");
    const job = makeReservedJob(scheduledTime);

    expect(calculateReservedDelay(job, now)).toBe(1);
  });

  test("returns 0 for far future past (large negative delay clamped to 0)", () => {
    const scheduledTime = "2020-01-01T00:00:00Z"; // way in the past
    const now = new Date("2025-10-25T00:01:00Z");
    const job = makeReservedJob(scheduledTime);

    expect(calculateReservedDelay(job, now)).toBe(0);
  });

  test("throws when called with cron schedule type", () => {
    const job = makeCronJob(true);
    expect(() => calculateReservedDelay(job, new Date())).toThrow(
      "Job schedule type must be reserved",
    );
  });
});
