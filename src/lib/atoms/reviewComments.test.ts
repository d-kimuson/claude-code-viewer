import { describe, expect, it } from "vitest";
import {
  addCommentToStore,
  clearCommentsFromStore,
  formatReviewMarkdown,
  type ReviewComment,
  removeCommentFromStore,
  sanitizeReviewCommentStore,
} from "./reviewComments";

const makeComment = (
  overrides: Partial<ReviewComment> = {},
): ReviewComment => ({
  id: "comment-1",
  filename: "src/app/Example.tsx",
  lineNumber: 10,
  lineType: "added",
  content: "This looks good",
  createdAt: 1000,
  ...overrides,
});

describe("sanitizeReviewCommentStore", () => {
  it("passes through valid data", () => {
    const valid = {
      "session-1": [makeComment()],
    };
    expect(sanitizeReviewCommentStore(valid, {})).toEqual(valid);
  });

  it("returns fallback for invalid data", () => {
    expect(sanitizeReviewCommentStore("invalid", {})).toEqual({});
    expect(sanitizeReviewCommentStore(null, {})).toEqual({});
    expect(sanitizeReviewCommentStore(undefined, {})).toEqual({});
  });

  it("returns fallback when comments have invalid shape", () => {
    const invalid = {
      "session-1": [{ id: 123, bad: true }],
    };
    expect(sanitizeReviewCommentStore(invalid, {})).toEqual({});
  });

  it("returns fallback when lineType is invalid", () => {
    const invalid = {
      "session-1": [
        {
          id: "comment-1",
          filename: "src/app/Example.tsx",
          lineNumber: 10,
          lineType: "unknown",
          content: "This looks good",
          createdAt: 1000,
        },
      ],
    };
    expect(sanitizeReviewCommentStore(invalid, {})).toEqual({});
  });
});

describe("addCommentToStore", () => {
  it("adds a comment to an empty session", () => {
    const comment = makeComment();
    const result = addCommentToStore({}, "session-1", comment);

    expect(result).toEqual({ "session-1": [comment] });
  });

  it("appends a comment to an existing session", () => {
    const existing = makeComment({ id: "comment-1" });
    const newComment = makeComment({ id: "comment-2", lineNumber: 20 });
    const store = { "session-1": [existing] };

    const result = addCommentToStore(store, "session-1", newComment);

    expect(result["session-1"]).toHaveLength(2);
    expect(result["session-1"]?.[1]).toEqual(newComment);
  });

  it("does not mutate the original store", () => {
    const store = { "session-1": [makeComment()] };
    const original = { ...store };

    addCommentToStore(store, "session-1", makeComment({ id: "comment-2" }));

    expect(store["session-1"]).toHaveLength(1);
    expect(store).toEqual(original);
  });
});

describe("removeCommentFromStore", () => {
  it("removes a comment by id", () => {
    const store = {
      "session-1": [
        makeComment({ id: "comment-1" }),
        makeComment({ id: "comment-2" }),
      ],
    };

    const result = removeCommentFromStore(store, "session-1", "comment-1");

    expect(result["session-1"]).toHaveLength(1);
    expect(result["session-1"]?.[0]?.id).toBe("comment-2");
  });

  it("removes the session key when last comment is removed", () => {
    const store = {
      "session-1": [makeComment({ id: "comment-1" })],
    };

    const result = removeCommentFromStore(store, "session-1", "comment-1");

    expect(result).toEqual({});
    expect("session-1" in result).toBe(false);
  });

  it("does not mutate the original store", () => {
    const store = { "session-1": [makeComment()] };
    removeCommentFromStore(store, "session-1", "comment-1");
    expect(store["session-1"]).toHaveLength(1);
  });
});

describe("clearCommentsFromStore", () => {
  it("removes all comments for a session", () => {
    const store = {
      "session-1": [makeComment(), makeComment({ id: "comment-2" })],
      "session-2": [makeComment({ id: "comment-3" })],
    };

    const result = clearCommentsFromStore(store, "session-1");

    expect(result).toEqual({
      "session-2": [makeComment({ id: "comment-3" })],
    });
  });

  it("is a no-op for non-existent session", () => {
    const store = { "session-1": [makeComment()] };
    const result = clearCommentsFromStore(store, "session-999");
    expect(result).toEqual(store);
  });
});

describe("formatReviewMarkdown", () => {
  it("returns header only for empty comments", () => {
    expect(formatReviewMarkdown([], "abc123", "def456")).toBe(
      "## Review: abc123 vs def456",
    );
  });

  it("formats a single comment", () => {
    const comments = [makeComment({ filename: "src/foo.ts", lineNumber: 42 })];
    const result = formatReviewMarkdown(comments, "abc", "def");

    expect(result).toBe(
      [
        "## Review: abc vs def",
        "",
        "### src/foo.ts (L42)",
        "This looks good",
      ].join("\n"),
    );
  });

  it("sorts multiple comments in the same file by line number", () => {
    const comments = [
      makeComment({
        id: "c1",
        filename: "src/foo.ts",
        lineNumber: 50,
        content: "Second",
      }),
      makeComment({
        id: "c2",
        filename: "src/foo.ts",
        lineNumber: 10,
        content: "First",
      }),
    ];
    const result = formatReviewMarkdown(comments, "a", "b");

    const lines = result.split("\n");
    expect(lines[2]).toBe("### src/foo.ts (L10)");
    expect(lines[3]).toBe("First");
    expect(lines[5]).toBe("### src/foo.ts (L50)");
    expect(lines[6]).toBe("Second");
  });

  it("sorts files by filename", () => {
    const comments = [
      makeComment({
        id: "c1",
        filename: "src/z.ts",
        lineNumber: 1,
        content: "Z file",
      }),
      makeComment({
        id: "c2",
        filename: "src/a.ts",
        lineNumber: 1,
        content: "A file",
      }),
    ];
    const result = formatReviewMarkdown(comments, "a", "b");

    const lines = result.split("\n");
    expect(lines[2]).toBe("### src/a.ts (L1)");
    expect(lines[5]).toBe("### src/z.ts (L1)");
  });
});
