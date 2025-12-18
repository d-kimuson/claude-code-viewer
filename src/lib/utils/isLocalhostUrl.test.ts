import { describe, expect, test } from "vitest";
import { isLocalhostUrl } from "./isLocalhostUrl";

describe("isLocalhostUrl", () => {
  test("returns true for localhost URLs", () => {
    expect(isLocalhostUrl("http://localhost")).toBe(true);
    expect(isLocalhostUrl("http://localhost:3000")).toBe(true);
    expect(isLocalhostUrl("https://localhost:8080")).toBe(true);
    expect(isLocalhostUrl("http://LOCALHOST")).toBe(true);
  });

  test("returns true for 127.0.0.1 URLs", () => {
    expect(isLocalhostUrl("http://127.0.0.1")).toBe(true);
    expect(isLocalhostUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalhostUrl("https://127.0.0.1:8080")).toBe(true);
  });

  test("returns true for IPv6 localhost URLs", () => {
    expect(isLocalhostUrl("http://[::1]")).toBe(true);
    expect(isLocalhostUrl("http://[::1]:3000")).toBe(true);
  });

  test("returns true for .localhost subdomain URLs", () => {
    expect(isLocalhostUrl("http://app.localhost")).toBe(true);
    expect(isLocalhostUrl("http://test.localhost:3000")).toBe(true);
  });

  test("returns false for non-localhost URLs", () => {
    expect(isLocalhostUrl("http://example.com")).toBe(false);
    expect(isLocalhostUrl("https://google.com")).toBe(false);
    expect(isLocalhostUrl("http://192.168.1.1")).toBe(false);
  });

  test("returns false for invalid URLs", () => {
    expect(isLocalhostUrl("not-a-url")).toBe(false);
    expect(isLocalhostUrl("")).toBe(false);
    expect(isLocalhostUrl("localhost")).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isLocalhostUrl(undefined)).toBe(false);
  });
});
