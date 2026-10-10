import { describe, expect, it } from "vitest";
import { assertLoginSucceeded } from "@/web/components/loginResponse";

const jsonResponse = (status: number, body: unknown, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

describe("assertLoginSucceeded", () => {
  it("resolves on a successful response", async () => {
    await expect(
      assertLoginSucceeded(jsonResponse(200, { success: true })),
    ).resolves.toBeUndefined();
  });

  it("throws the server error message on 401", async () => {
    await expect(
      assertLoginSucceeded(jsonResponse(401, { error: "Invalid password" })),
    ).rejects.toThrow("Invalid password");
  });

  it("includes the retry delay on 429", async () => {
    await expect(
      assertLoginSucceeded(
        jsonResponse(429, { error: "Too many failed attempts" }, { "Retry-After": "4" }),
      ),
    ).rejects.toThrow("Too many failed attempts. Try again in 4 seconds.");
  });

  it("falls back to a generic message when the body is not JSON", async () => {
    await expect(assertLoginSucceeded(new Response("nope", { status: 500 }))).rejects.toThrow(
      "Login failed (500)",
    );
  });
});
