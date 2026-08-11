import { describe, expect, test, vi } from "vitest";
import { createBasePathFetch } from "./basePathFetch";

describe("createBasePathFetch", () => {
  test("strips the configured base path before dispatch", async () => {
    const handler = vi.fn((request: Request) =>
      Promise.resolve(new Response(new URL(request.url).pathname)),
    );
    const fetch = createBasePathFetch("/ccv", handler);

    const response = await fetch(new Request("http://localhost/ccv/api/version?x=1"));

    expect(await response.text()).toBe("/api/version");
    expect(handler).toHaveBeenCalledOnce();
  });

  test("maps the exact base path to root", async () => {
    const fetch = createBasePathFetch("/ccv", (request) =>
      Promise.resolve(new Response(new URL(request.url).pathname)),
    );

    expect(await (await fetch(new Request("http://localhost/ccv"))).text()).toBe("/");
  });

  test("rejects requests outside the configured base path", async () => {
    const handler = vi.fn(() => Promise.resolve(new Response("unexpected")));
    const fetch = createBasePathFetch("/ccv", handler);

    const response = await fetch(new Request("http://localhost/api/version"));

    expect(response.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });

  test.each([
    "http://localhost/ccv-other/api/version",
    "http://localhost/ccv%2Fapi/version",
    "http://localhost/ccv/%2e%2e/api/version",
  ])("rejects prefix and encoded traversal bypasses: %s", async (url) => {
    const handler = vi.fn(() => Promise.resolve(new Response("unexpected")));
    const fetch = createBasePathFetch("/ccv", handler);

    expect((await fetch(new Request(url))).status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });

  test("preserves method, body, headers, and query parameters", async () => {
    const fetch = createBasePathFetch("/ccv", async (request) =>
      Response.json({
        method: request.method,
        body: await request.text(),
        authorization: request.headers.get("Authorization"),
        search: new URL(request.url).search,
      }),
    );

    const response = await fetch(
      new Request("http://localhost/ccv/api/config?mode=test", {
        method: "POST",
        body: "payload",
        headers: { Authorization: "Bearer token" },
      }),
    );

    expect(await response.json()).toEqual({
      method: "POST",
      body: "payload",
      authorization: "Bearer token",
      search: "?mode=test",
    });
  });

  test("keeps root-mounted requests unchanged", async () => {
    const fetch = createBasePathFetch("/", (request) =>
      Promise.resolve(new Response(new URL(request.url).pathname)),
    );

    expect(await (await fetch(new Request("http://localhost/api/version"))).text()).toBe(
      "/api/version",
    );
  });
});
