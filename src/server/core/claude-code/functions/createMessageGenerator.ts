import type { SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { DocumentBlockParam, ImageBlockParam } from "@anthropic-ai/sdk/resources";
import { z } from "zod";
import { controllablePromise } from "../../../../lib/controllablePromise.ts";
import {
  documentBlockSchema,
  imageBlockSchema,
  type VideoBlockParam,
  videoBlockSchema,
} from "../schema.ts";

export type UserMessageInput = {
  text: string;
  images?: readonly ImageBlockParam[];
  videos?: readonly VideoBlockParam[];
  documents?: readonly DocumentBlockParam[];
};

const generatedUserMessageSchema = z.object({
  type: z.literal("user"),
  message: z.object({
    role: z.literal("user"),
    content: z.union([
      z.string(),
      z.array(
        z.union([
          z.object({ type: z.literal("text"), text: z.string() }),
          imageBlockSchema,
          videoBlockSchema,
          documentBlockSchema,
        ]),
      ),
    ]),
  }),
  parent_tool_use_id: z.null(),
});

const sdkUserMessageSchema = z.custom<SDKUserMessage>(
  (value) => generatedUserMessageSchema.safeParse(value).success,
);

export type OnMessage = (message: SDKMessage) => void | Promise<void>;

export type MessageGenerator = () => AsyncGenerator<SDKUserMessage, void, unknown>;

export const createMessageGenerator = (): {
  generateMessages: MessageGenerator;
  setNextMessage: (input: UserMessageInput) => void;
  setHooks: (hooks: {
    onNextMessageSet?: (input: UserMessageInput) => void | Promise<void>;
    onNewUserMessageResolved?: (input: UserMessageInput) => void | Promise<void>;
  }) => void;
} => {
  let sendMessagePromise = controllablePromise<UserMessageInput>();
  let registeredHooks: {
    onNextMessageSet: ((input: UserMessageInput) => void | Promise<void>)[];
    onNewUserMessageResolved: ((input: UserMessageInput) => void | Promise<void>)[];
  } = {
    onNextMessageSet: [],
    onNewUserMessageResolved: [],
  };

  const createMessage = (input: UserMessageInput): SDKUserMessage => {
    const { images = [], videos = [], documents = [] } = input;

    if (images.length === 0 && videos.length === 0 && documents.length === 0) {
      return sdkUserMessageSchema.parse({
        type: "user",
        message: {
          role: "user",
          content: input.text,
        },
        parent_tool_use_id: null,
      });
    }

    return sdkUserMessageSchema.parse({
      type: "user",
      message: {
        role: "user",
        content: [
          {
            type: "text",
            text: input.text,
          },
          ...images,
          ...videos,
          ...documents,
        ],
      },
      parent_tool_use_id: null,
    });
  };

  const generateMessages = async function* (): ReturnType<MessageGenerator> {
    sendMessagePromise = controllablePromise<UserMessageInput>();

    while (true) {
      const message = await sendMessagePromise.promise;
      sendMessagePromise = controllablePromise<UserMessageInput>();
      void Promise.allSettled(
        registeredHooks.onNewUserMessageResolved.map(async (hook) => {
          await hook(message);
        }),
      );

      yield createMessage(message);
    }
  };

  const setNextMessage = (input: UserMessageInput) => {
    sendMessagePromise.resolve(input);
    void Promise.allSettled(
      registeredHooks.onNextMessageSet.map(async (hook) => {
        await hook(input);
      }),
    );
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
    setHooks,
  };
};
