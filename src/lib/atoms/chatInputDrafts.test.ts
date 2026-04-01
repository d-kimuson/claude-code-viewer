import { describe, expect, it } from "vitest";
import {
  buildChatInputDraftKey,
  sanitizeChatInputDraftStore,
  updateChatInputDraftStore,
} from "./chatInputDrafts";

describe("chatInputDrafts", () => {
  it("builds a draft key from project and session scope", () => {
    expect(
      buildChatInputDraftKey({
        projectId: "project-a",
        sessionId: "session-id:1234",
      }),
    ).toBe("project-a:session-id:1234");
  });

  it("uses new-session for unsent drafts", () => {
    expect(
      buildChatInputDraftKey({
        projectId: "project-a",
        sessionId: "new-session",
      }),
    ).toBe("project-a:new-session");
  });

  it("updates the target draft without mutating the original store", () => {
    const store = {
      "project-a:new-session": "existing",
    };

    const result = updateChatInputDraftStore(
      store,
      "project-b:session-id:1234",
      "draft text",
    );

    expect(result).toEqual({
      "project-a:new-session": "existing",
      "project-b:session-id:1234": "draft text",
    });
    expect(store).toEqual({
      "project-a:new-session": "existing",
    });
  });

  it("removes the draft entry when the next value is empty", () => {
    const store = {
      "project-a:new-session": "existing",
      "project-b:session-id:1234": "draft text",
    };

    const result = updateChatInputDraftStore(
      store,
      "project-b:session-id:1234",
      "",
    );

    expect(result).toEqual({
      "project-a:new-session": "existing",
    });
  });

  it("sanitizes invalid storage payloads", () => {
    expect(sanitizeChatInputDraftStore("invalid", {})).toEqual({});
    expect(
      sanitizeChatInputDraftStore(
        {
          valid: "draft",
          invalid: 123,
        },
        {},
      ),
    ).toEqual({});
  });
});
