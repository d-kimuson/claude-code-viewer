import type { SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-code";
import { controllablePromise } from "../../../lib/controllablePromise";

export type OnMessage = (message: SDKMessage) => void | Promise<void>;

export type MessageGenerator = () => AsyncGenerator<
  SDKUserMessage,
  void,
  unknown
>;

export const createMessageGenerator = (): {
  generateMessages: MessageGenerator;
  setNextMessage: (message: string) => void;
  setHooks: (hooks: {
    onNextMessageSet?: (message: string) => void | Promise<void>;
    onNewUserMessageResolved?: (message: string) => void | Promise<void>;
  }) => void;
} => {
  let sendMessagePromise = controllablePromise<string>();
  let registeredHooks: {
    onNextMessageSet: ((message: string) => void | Promise<void>)[];
    onNewUserMessageResolved: ((message: string) => void | Promise<void>)[];
  } = {
    onNextMessageSet: [],
    onNewUserMessageResolved: [],
  };

  const createMessage = (message: string): SDKUserMessage => {
    return {
      type: "user",
      message: {
        role: "user",
        content: message,
      },
    } as SDKUserMessage;
  };

  async function* generateMessages(): ReturnType<MessageGenerator> {
    sendMessagePromise = controllablePromise<string>();

    while (true) {
      const message = await sendMessagePromise.promise;
      sendMessagePromise = controllablePromise<string>();
      void Promise.allSettled(
        registeredHooks.onNewUserMessageResolved.map((hook) => hook(message)),
      );

      yield createMessage(message);
    }
  }

  const setNextMessage = (message: string) => {
    sendMessagePromise.resolve(message);
    void Promise.allSettled(
      registeredHooks.onNextMessageSet.map((hook) => hook(message)),
    );
  };

  const setHooks = (hooks: {
    onNextMessageSet?: (message: string) => void | Promise<void>;
    onNewUserMessageResolved?: (message: string) => void | Promise<void>;
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
