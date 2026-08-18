import { describe, expect, test, vi } from "vitest";
import { enableImmediateServiceWorkerUpdate } from "./enableImmediateServiceWorkerUpdate.ts";

describe("enableImmediateServiceWorkerUpdate", () => {
  test("claims open clients and activates the latest worker without waiting for tabs to close", async () => {
    const claimClients = vi.fn();
    const skipWaiting = vi.fn(() => Promise.resolve());

    await enableImmediateServiceWorkerUpdate({ claimClients, skipWaiting });

    expect(claimClients).toHaveBeenCalledOnce();
    expect(skipWaiting).toHaveBeenCalledOnce();
  });
});
