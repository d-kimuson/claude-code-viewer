import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { expect, test } from "vitest";
import { testPlatformLayer } from "../../../testing/layers/testPlatformLayer";
import { sidebarLayoutRoutes } from "./sidebarLayoutRoutes";
const app = (content?: string) =>
  Effect.runPromise(
    sidebarLayoutRoutes.pipe(
      Effect.provide(testPlatformLayer()),
      Effect.provide(
        FileSystem.layerNoop({
          exists: () => Effect.succeed(content !== undefined),
          readFileString: () => Effect.succeed(content ?? ""),
        }),
      ),
    ),
  );
test("GET reports corrupt JSON and invalid schema as 500", async () => {
  for (const content of ["{broken", '{"version":2}']) {
    const response = await (await app(content)).request("/");
    expect(response.status).toBe(500);
    expect(await response.text()).toContain("Invalid sidebar layout");
  }
});
test("GET missing file returns initial layout", async () => {
  const response = await (await app()).request("/");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ version: 1, order: [], hidden: [], expanded: [] });
});
test("PUT rejects oversized arrays and strings in each field", async () => {
  const routes = await app();
  for (const field of ["order", "hidden", "expanded"]) {
    for (const value of [Array(2001).fill("x"), ["x".repeat(1025)]]) {
      const response = await routes.request("/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: 1, order: [], hidden: [], expanded: [], [field]: value }),
      });
      expect(response.status).toBe(400);
    }
  }
});
