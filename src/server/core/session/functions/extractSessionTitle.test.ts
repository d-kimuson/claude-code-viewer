import { describe, expect, it } from "vitest";
import type { ExtendedConversation } from "../../types.ts";
import { extractSessionTitle } from "./extractSessionTitle.ts";

describe("extractSessionTitle", () => {
  it("uses ai-title entries as the session title", () => {
    const conversations: ExtendedConversation[] = [
      {
        type: "ai-title",
        aiTitle: "macro-dashboard のフォントと UI デザイン修正",
        sessionId: "379ea227-4913-484f-9a55-fc76a9fc215f",
      },
    ];

    expect(extractSessionTitle(conversations)).toBe("macro-dashboard のフォントと UI デザイン修正");
  });

  it("keeps user custom titles above ai-generated titles", () => {
    const conversations: ExtendedConversation[] = [
      {
        type: "ai-title",
        aiTitle: "AI generated title",
        sessionId: "session-1",
      },
      {
        type: "custom-title",
        customTitle: "User renamed title",
        sessionId: "session-1",
      },
    ];

    expect(extractSessionTitle(conversations)).toBe("User renamed title");
  });
});
