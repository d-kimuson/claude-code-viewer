import { describe, expect, test } from "vitest";
import { createVirtualUserEntry } from "./createVirtualUserEntry.ts";
import type { VirtualMessage } from "./virtualMessageStore.ts";

describe("createVirtualUserEntry", () => {
  const baseMessage: VirtualMessage = {
    sessionId: "abc-123",
    projectId: "proj-1",
    userMessage: "What is this code doing?",
    sentAt: "2024-06-15T12:30:00.000Z",
    isNewSession: true,
  };

  test("returns a UserEntry with type 'user'", () => {
    const entry = createVirtualUserEntry(baseMessage);
    expect(entry.type).toBe("user");
  });

  test("sets message role to 'user' and content to userMessage", () => {
    const entry = createVirtualUserEntry(baseMessage);
    expect(entry.message.role).toBe("user");
    expect(entry.message.content).toBe("What is this code doing?");
  });

  test("generates uuid with vc__ prefix pattern", () => {
    const entry = createVirtualUserEntry(baseMessage);
    expect(entry.uuid).toBe("vc__abc-123__2024-06-15T12:30:00.000Z");
  });

  test("sets timestamp from sentAt", () => {
    const entry = createVirtualUserEntry(baseMessage);
    expect(entry.timestamp).toBe("2024-06-15T12:30:00.000Z");
  });

  test("sets fixed fields correctly", () => {
    const entry = createVirtualUserEntry(baseMessage);
    expect(entry.isSidechain).toBe(false);
    expect(entry.userType).toBe("external");
    expect(entry.cwd).toBe("");
    expect(entry.parentUuid).toBeNull();
    expect(entry.version).toBe("virtual");
  });

  test("sets sessionId from message", () => {
    const entry = createVirtualUserEntry(baseMessage);
    expect(entry.sessionId).toBe("abc-123");
  });

  test("handles different message content", () => {
    const msg: VirtualMessage = {
      ...baseMessage,
      userMessage: "Fix the bug in line 42",
    };
    const entry = createVirtualUserEntry(msg);
    expect(entry.message.content).toBe("Fix the bug in line 42");
  });
});
