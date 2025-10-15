import type {
  SDKMessage,
  SDKSystemMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-code";

export type OnMessage = (message: SDKMessage) => void | Promise<void>;

export type MessageGenerator = () => AsyncGenerator<
  SDKUserMessage,
  void,
  unknown
>;

const createPromise = <T>() => {
  let promiseResolve: ((value: T) => void) | undefined;
  let promiseReject: ((reason?: unknown) => void) | undefined;

  const promise = new Promise<T>((resolve, reject) => {
    promiseResolve = resolve;
    promiseReject = reject;
  });

  if (!promiseResolve || !promiseReject) {
    throw new Error("Illegal state: Promise not created");
  }

  return {
    promise,
    resolve: promiseResolve,
    reject: promiseReject,
  } as const;
};

export type InitMessageContext = {
  initMessage: SDKSystemMessage;
};

export const createMessageGenerator = (
  firstMessage: string,
): {
  generateMessages: MessageGenerator;
  setNextMessage: (message: string) => void;
  setInitMessagePromise: () => void;
  resolveInitMessage: (context: InitMessageContext) => void;
  awaitInitMessage: (ctx: InitMessageContext) => Promise<void>;
} => {
  let sendMessagePromise = createPromise<string>();
  let receivedInitMessagePromise = createPromise<InitMessageContext>();

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
    yield createMessage(firstMessage);

    while (true) {
      const message = await sendMessagePromise.promise;
      sendMessagePromise = createPromise<string>();

      yield createMessage(message);
    }
  }

  const setNextMessage = (message: string) => {
    sendMessagePromise.resolve(message);
  };

  const setInitMessagePromise = () => {
    receivedInitMessagePromise = createPromise<InitMessageContext>();
  };

  const resolveInitMessage = (context: InitMessageContext) => {
    receivedInitMessagePromise.resolve(context);
  };

  const awaitInitMessage = async () => {
    await receivedInitMessagePromise.promise;
  };

  return {
    generateMessages,
    setNextMessage,
    setInitMessagePromise,
    resolveInitMessage,
    awaitInitMessage,
  };
};
