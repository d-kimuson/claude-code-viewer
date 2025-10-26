import type {
  SDKMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type {
  DocumentBlockParam,
  ImageBlockParam,
} from "@anthropic-ai/sdk/resources";
import { controllablePromise } from "../../../../lib/controllablePromise";

export type UserMessageInput = {
  text: string;
  images?: readonly ImageBlockParam[];
  documents?: readonly DocumentBlockParam[];
};

export type OnMessage = (message: SDKMessage) => void | Promise<void>;

export type MessageGenerator = () => AsyncGenerator<
  SDKUserMessage,
  void,
  unknown
>;

export const createMessageGenerator = (): {
  generateMessages: MessageGenerator;
  setNextMessage: (input: UserMessageInput) => void;
  setHooks: (hooks: {
    onNextMessageSet?: (input: UserMessageInput) => void | Promise<void>;
    onNewUserMessageResolved?: (
      input: UserMessageInput,
    ) => void | Promise<void>;
  }) => void;
} => {
  let sendMessagePromise = controllablePromise<UserMessageInput>();
  let registeredHooks: {
    onNextMessageSet: ((input: UserMessageInput) => void | Promise<void>)[];
    onNewUserMessageResolved: ((
      input: UserMessageInput,
    ) => void | Promise<void>)[];
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
      } satisfies Omit<SDKUserMessage, "session_id"> as SDKUserMessage;
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
    } as SDKUserMessage;
  };

  async function* generateMessages(): ReturnType<MessageGenerator> {
    sendMessagePromise = controllablePromise<UserMessageInput>();

    while (true) {
      const message = await sendMessagePromise.promise;
      sendMessagePromise = controllablePromise<UserMessageInput>();
      void Promise.allSettled(
        registeredHooks.onNewUserMessageResolved.map((hook) => hook(message)),
      );

      yield createMessage(message);
    }
  }

  const setNextMessage = (input: UserMessageInput) => {
    sendMessagePromise.resolve(input);
    void Promise.allSettled(
      registeredHooks.onNextMessageSet.map((hook) => hook(input)),
    );
  };

  const setHooks = (hooks: {
    onNextMessageSet?: (input: UserMessageInput) => void | Promise<void>;
    onNewUserMessageResolved?: (
      input: UserMessageInput,
    ) => void | Promise<void>;
  }) => {
    registeredHooks = {
      onNextMessageSet: [
        ...(hooks?.onNextMessageSet ? [hooks.onNextMessageSet] : []),
        ...registeredHooks.onNextMessageSet,
      ],
      onNewUserMessageResolved: [
        ...(hooks?.onNewUserMessageResolved
          ? [hooks.onNewUserMessageResolved]
          : []),
        ...registeredHooks.onNewUserMessageResolved,
      ],
    };
  };

  return {
    generateMessages,
    setNextMessage,
    setHooks,
  };
};
