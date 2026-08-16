import { describe, expect, it } from "vitest";
import { userMessageInputSchema } from "./schema.ts";

describe("userMessageInputSchema", () => {
  it("preserves supported base64 video blocks", () => {
    const videos = [
      "video/mp4",
      "video/avi",
      "video/x-msvideo",
      "video/mov",
      "video/x-matroska",
    ].map((mediaType) => ({
      type: "video",
      source: {
        type: "base64",
        media_type: mediaType,
        data: "encoded-video",
      },
    }));

    const result = userMessageInputSchema.parse({
      text: "Describe these videos",
      videos,
    });

    expect(result.videos).toEqual(videos);
  });

  it("rejects unsupported video media types", () => {
    const result = userMessageInputSchema.safeParse({
      text: "Describe this video",
      videos: [
        {
          type: "video",
          source: {
            type: "base64",
            media_type: "video/webm",
            data: "encoded-video",
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
