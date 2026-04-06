import { describe, expect, test, vi } from "vitest";
import { createMessageGenerator, type UserMessageInput } from "./createMessageGenerator.ts";

const makeInput = (text: string): UserMessageInput => ({ text });

describe("createMessageGenerator", () => {
  describe("queue behavior", () => {
    test("messages are dequeued in FIFO order", async () => {
      const { generateMessages, setNextMessage } = createMessageGenerator();
      const gen = generateMessages();

      setNextMessage(makeInput("first"));
      setNextMessage(makeInput("second"));
      setNextMessage(makeInput("third"));

      const r1 = await gen.next();
      const r2 = await gen.next();
      const r3 = await gen.next();

      expect(r1.value?.message.content).toBe("first");
      expect(r2.value?.message.content).toBe("second");
      expect(r3.value?.message.content).toBe("third");
    });

    test("getQueueSize reflects current queue length", () => {
      const { setNextMessage, getQueueSize } = createMessageGenerator();

      expect(getQueueSize()).toBe(0);

      setNextMessage(makeInput("a"));
      expect(getQueueSize()).toBe(1);

      setNextMessage(makeInput("b"));
      expect(getQueueSize()).toBe(2);
    });

    test("getQueuedMessages returns correct data", () => {
      const { setNextMessage, getQueuedMessages } = createMessageGenerator();

      setNextMessage(makeInput("hello"));

      const queued = getQueuedMessages();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.input.text).toBe("hello");
      expect(queued[0]?.queuedAt).toBeDefined();
    });

    test("queue size decreases as messages are consumed", async () => {
      const { generateMessages, setNextMessage, getQueueSize } = createMessageGenerator();
      const gen = generateMessages();

      setNextMessage(makeInput("a"));
      setNextMessage(makeInput("b"));
      expect(getQueueSize()).toBe(2);

      await gen.next();
      expect(getQueueSize()).toBe(1);

      await gen.next();
      expect(getQueueSize()).toBe(0);
    });

    test("getQueuedMessages returns a snapshot (not a reference to internal array)", () => {
      const { setNextMessage, getQueuedMessages } = createMessageGenerator();

      setNextMessage(makeInput("x"));
      const snapshot = getQueuedMessages();

      setNextMessage(makeInput("y"));
      // The previously returned snapshot should not be affected
      expect(snapshot).toHaveLength(1);
      expect(getQueuedMessages()).toHaveLength(2);
    });
  });

  describe("onNewUserMessageResolved hook", () => {
    test("hooks are awaited before yield", async () => {
      const order: string[] = [];
      const { generateMessages, setNextMessage, setHooks } = createMessageGenerator();

      setHooks({
        onNewUserMessageResolved: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          order.push("hook-done");
        },
      });

      const gen = generateMessages();
      setNextMessage(makeInput("msg"));

      await gen.next();
      order.push("yield-done");

      // Hook must complete before yield returns to us
      expect(order).toEqual(["hook-done", "yield-done"]);
    });

    test("hooks are called for each queued message in order", async () => {
      const hookCalls: string[] = [];
      const { generateMessages, setNextMessage, setHooks } = createMessageGenerator();

      setHooks({
        onNewUserMessageResolved: (input) => {
          hookCalls.push(input.text);
        },
      });

      const gen = generateMessages();
      setNextMessage(makeInput("first"));
      setNextMessage(makeInput("second"));

      await gen.next();
      await gen.next();

      expect(hookCalls).toEqual(["first", "second"]);
    });
  });

  describe("onNextMessageSet hook", () => {
    test("is called when setNextMessage is invoked", () => {
      const hookFn = vi.fn();
      const { setNextMessage, setHooks } = createMessageGenerator();

      setHooks({ onNextMessageSet: hookFn });

      setNextMessage(makeInput("test"));
      expect(hookFn).toHaveBeenCalledWith(makeInput("test"));
    });
  });

  describe("message creation", () => {
    test("creates text-only messages correctly", async () => {
      const { generateMessages, setNextMessage } = createMessageGenerator();
      const gen = generateMessages();

      setNextMessage(makeInput("hello"));
      const result = await gen.next();

      expect(result.value).toEqual({
        type: "user",
        message: { role: "user", content: "hello" },
        parent_tool_use_id: null,
      });
    });

    test("message sent while generator is waiting is delivered", async () => {
      const { generateMessages, setNextMessage } = createMessageGenerator();
      const gen = generateMessages();

      // Generator is waiting, then we send a message
      const resultPromise = gen.next();
      setNextMessage(makeInput("delayed"));

      const result = await resultPromise;
      expect(result.value?.message.content).toBe("delayed");
    });
  });
});
