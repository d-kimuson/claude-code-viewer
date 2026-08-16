// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { determineFileType, isSupportedMimeType, processFile } from "./fileUtils.ts";

describe("video attachments", () => {
  it("recognizes supported video MIME types", () => {
    expect(determineFileType("video/mp4")).toBe("video");
    expect(isSupportedMimeType("video/mp4")).toBe(true);
    expect(isSupportedMimeType("video/avi")).toBe(true);
    expect(isSupportedMimeType("video/x-msvideo")).toBe(true);
    expect(isSupportedMimeType("video/quicktime")).toBe(true);
    expect(isSupportedMimeType("video/x-matroska")).toBe(true);
    expect(isSupportedMimeType("video/webm")).toBe(false);
  });

  it("converts MOV files to the supported base64 media type", async () => {
    const file = new File(["video"], "clip.mov", { type: "video/quicktime" });

    await expect(processFile(file)).resolves.toEqual({
      type: "video",
      block: {
        type: "video",
        source: {
          type: "base64",
          media_type: "video/mov",
          data: "dmlkZW8=",
        },
      },
    });
  });
});
