import { describe, expect, it } from "vitest";
import { createMessageGenerator } from "./createMessageGenerator.ts";

describe("createMessageGenerator", () => {
  it("includes video blocks in generated user messages", async () => {
    const { generateMessages, setNextMessage } = createMessageGenerator();
    const messages = generateMessages();
    const nextMessage = messages.next();

    setNextMessage({
      text: "Describe this video",
      videos: [
        {
          type: "video",
          source: {
            type: "base64",
            media_type: "video/mp4",
            data: "encoded-video",
          },
        },
      ],
    });

    await expect(nextMessage).resolves.toMatchObject({
      done: false,
      value: {
        type: "user",
        message: {
          role: "user",
          content: [
            { type: "text", text: "Describe this video" },
            {
              type: "video",
              source: {
                type: "base64",
                media_type: "video/mp4",
                data: "encoded-video",
              },
            },
          ],
        },
        parent_tool_use_id: null,
      },
    });

    await messages.return();
  });
});
