import { describe, expect, test, vi } from "vitest";
import { enableImmediateServiceWorkerUpdate } from "./enableImmediateServiceWorkerUpdate.ts";

describe("enableImmediateServiceWorkerUpdate", () => {
  test("claims open clients and activates the latest worker without waiting for tabs to close", async () => {
    const calls: string[] = [];
    const activation = Promise.resolve();
    const claimClients = vi.fn(() => {
      calls.push("claimClients");
    });
    const skipWaiting = vi.fn(() => {
      calls.push("skipWaiting");
      return activation;
    });

    const result = enableImmediateServiceWorkerUpdate({ claimClients, skipWaiting });

    expect(result).toBe(activation);
    await result;
    expect(calls).toEqual(["claimClients", "skipWaiting"]);
    expect(claimClients).toHaveBeenCalledOnce();
    expect(skipWaiting).toHaveBeenCalledOnce();
  });
});
