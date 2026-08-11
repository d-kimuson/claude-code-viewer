import { Hono } from "hono";
import { describe, expect, test } from "vitest";
import type { HonoContext } from "../app.ts";
import { createConfigMiddleware } from "./config.middleware.ts";

const createApp = (basePath: string) => {
  const app = new Hono<HonoContext>();
  app.use(createConfigMiddleware(basePath));
  app.get("/", (c) => c.json({ ok: true }));
  return app;
};

describe("createConfigMiddleware", () => {
  test("scopes config cookies to a nested base path and removes legacy root cookies", async () => {
    const response = await createApp("/ccv").request("/", {
      headers: { Cookie: 'ccv-config={"locale":"en"}' },
    });
    const setCookie = response.headers.get("Set-Cookie") ?? "";

    expect(setCookie).toContain("ccv-config=");
    expect(setCookie).toContain("Path=/ccv");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=0");
  });

  test("keeps the default config cookie at root", async () => {
    const response = await createApp("/").request("/");

    expect(response.headers.get("Set-Cookie")).toContain("Path=/");
  });
});
