import { afterEach, describe, expect, test } from "vitest";
import {
  addVirtualMessage,
  clear,
  getVirtualMessage,
  getVirtualMessagesByProject,
  removeVirtualMessage,
  type VirtualMessage,
} from "./virtualMessageStore.ts";

const makeMessage = (overrides: Partial<VirtualMessage> = {}): VirtualMessage => ({
  sessionId: "session-1",
  projectId: "project-1",
  userMessage: "hello",
  sentAt: "2024-01-01T00:00:00.000Z",
  isNewSession: true,
  ...overrides,
});

afterEach(() => {
  clear();
});

describe("virtualMessageStore", () => {
  describe("addVirtualMessage / getVirtualMessage", () => {
    test("stores and retrieves a message by sessionId", () => {
      const msg = makeMessage();
      addVirtualMessage(msg);
      expect(getVirtualMessage("session-1")).toEqual(msg);
    });

    test("returns undefined for unknown sessionId", () => {
      expect(getVirtualMessage("unknown")).toBeUndefined();
    });

    test("overwrites existing message for same sessionId", () => {
      addVirtualMessage(makeMessage({ userMessage: "first" }));
      addVirtualMessage(makeMessage({ userMessage: "second" }));
      expect(getVirtualMessage("session-1")?.userMessage).toBe("second");
    });
  });

  describe("removeVirtualMessage", () => {
    test("removes a stored message", () => {
      addVirtualMessage(makeMessage());
      removeVirtualMessage("session-1");
      expect(getVirtualMessage("session-1")).toBeUndefined();
    });

    test("does nothing when removing non-existent sessionId", () => {
      removeVirtualMessage("non-existent");
      // Verify no error thrown and store is still functional
      expect(getVirtualMessage("non-existent")).toBeUndefined();
    });
  });

  describe("getVirtualMessagesByProject", () => {
    test("returns messages matching the projectId", () => {
      addVirtualMessage(makeMessage({ sessionId: "s1", projectId: "project-a" }));
      addVirtualMessage(makeMessage({ sessionId: "s2", projectId: "project-b" }));
      addVirtualMessage(makeMessage({ sessionId: "s3", projectId: "project-a" }));

      const result = getVirtualMessagesByProject("project-a");
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.sessionId)).toEqual(expect.arrayContaining(["s1", "s3"]));
    });

    test("returns empty array when no messages match", () => {
      addVirtualMessage(makeMessage({ projectId: "project-x" }));
      expect(getVirtualMessagesByProject("project-y")).toEqual([]);
    });
  });

  describe("clear", () => {
    test("removes all messages", () => {
      addVirtualMessage(makeMessage({ sessionId: "s1" }));
      addVirtualMessage(makeMessage({ sessionId: "s2" }));
      clear();
      expect(getVirtualMessage("s1")).toBeUndefined();
      expect(getVirtualMessage("s2")).toBeUndefined();
    });
  });
});
