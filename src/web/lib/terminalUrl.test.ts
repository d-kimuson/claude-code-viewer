import { describe, expect, test } from "vitest";
import { buildWebSocketUrl } from "@/web/lib/terminalUrl";

describe("buildWebSocketUrl", () => {
  test("uses the configured base path and secure websocket protocol", () => {
    expect(buildWebSocketUrl("https://example.com", "/ccv", "session-1", "/repo path")).toBe(
      "wss://example.com/ccv/ws/terminal?sessionId=session-1&cwd=%2Frepo+path",
    );
  });

  test("keeps the root path for HTTP origins", () => {
    expect(buildWebSocketUrl("http://localhost:3000", "/", undefined, undefined)).toBe(
      "ws://localhost:3000/ws/terminal",
    );
  });
});
