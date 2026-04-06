import type { SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { DocumentBlockParam, ImageBlockParam } from "@anthropic-ai/sdk/resources";
import { controllablePromise } from "../../../../lib/controllablePromise.ts";

export type UserMessageInput = {
  text: string;
  images?: readonly ImageBlockParam[];
  documents?: readonly DocumentBlockParam[];
};

export type QueuedMessage = {
  readonly input: UserMessageInput;
  readonly queuedAt: string;
};

export type OnMessage = (message: SDKMessage) => void | Promise<void>;

export type MessageGenerator = () => AsyncGenerator<SDKUserMessage, void, unknown>;

export const createMessageGenerator = (): {
  generateMessages: MessageGenerator;
  setNextMessage: (input: UserMessageInput) => void;
  getQueuedMessages: () => readonly QueuedMessage[];
  getQueueSize: () => number;
  setHooks: (hooks: {
    onNextMessageSet?: (input: UserMessageInput) => void | Promise<void>;
    onNewUserMessageResolved?: (input: UserMessageInput) => void | Promise<void>;
  }) => void;
} => {
  let sendMessagePromise = controllablePromise<UserMessageInput>();
  const queue: QueuedMessage[] = [];
  let registeredHooks: {
    onNextMessageSet: ((input: UserMessageInput) => void | Promise<void>)[];
    onNewUserMessageResolved: ((input: UserMessageInput) => void | Promise<void>)[];
  } = {
    onNextMessageSet: [],
    onNewUserMessageResolved: [],
  };

  const createMessage = (input: UserMessageInput): SDKUserMessage => {
    const { images = [], documents = [] } = input;

    if (images.length === 0 && documents.length === 0) {
      return {
        type: "user",
        message: {
          role: "user",
          content: input.text,
        },
        parent_tool_use_id: null,
      } satisfies SDKUserMessage;
    }

    return {
      type: "user",
      message: {
        role: "user",
        content: [
          {
            type: "text",
            text: input.text,
          },
          ...images,
          ...documents,
        ],
      },
      parent_tool_use_id: null,
    } satisfies SDKUserMessage;
  };

  const generateMessages = async function* (): ReturnType<MessageGenerator> {
    sendMessagePromise = controllablePromise<UserMessageInput>();

    while (true) {
      // If the queue is empty, wait for a wake-up signal
      if (queue.length === 0) {
        await sendMessagePromise.promise;
        sendMessagePromise = controllablePromise<UserMessageInput>();
      }

      // Drain messages from the queue in FIFO order
      while (queue.length > 0) {
        const queued = queue.shift();
        if (queued === undefined) break;
        await Promise.allSettled(
          registeredHooks.onNewUserMessageResolved.map(async (hook) => {
            await hook(queued.input);
          }),
        );

        yield createMessage(queued.input);
      }
    }
  };

  const setNextMessage = (input: UserMessageInput) => {
    queue.push({
      input,
      queuedAt: new Date().toISOString(),
    });

    // Wake the generator if it is waiting
    if (sendMessagePromise.status === "pending") {
      sendMessagePromise.resolve(input);
    }

    void Promise.allSettled(
      registeredHooks.onNextMessageSet.map(async (hook) => {
        await hook(input);
      }),
    );
  };

  const getQueuedMessages = (): readonly QueuedMessage[] => {
    return [...queue];
  };

  const getQueueSize = (): number => {
    return queue.length;
  };

  const setHooks = (hooks: {
    onNextMessageSet?: (input: UserMessageInput) => void | Promise<void>;
    onNewUserMessageResolved?: (input: UserMessageInput) => void | Promise<void>;
  }) => {
    registeredHooks = {
      onNextMessageSet: [
        ...(hooks?.onNextMessageSet ? [hooks.onNextMessageSet] : []),
        ...registeredHooks.onNextMessageSet,
      ],
      onNewUserMessageResolved: [
        ...(hooks?.onNewUserMessageResolved ? [hooks.onNewUserMessageResolved] : []),
        ...registeredHooks.onNewUserMessageResolved,
      ],
    };
  };

  return {
    generateMessages,
    setNextMessage,
    getQueuedMessages,
    getQueueSize,
    setHooks,
  };
};
