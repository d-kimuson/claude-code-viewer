import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  convertNewlinesToBreaks,
  UserTextContent,
} from "@/web/app/projects/[projectId]/sessions/[sessionId]/components/conversationList/UserTextContent";

describe("convertNewlinesToBreaks", () => {
  test("converts single newline to hard line break", () => {
    expect(convertNewlinesToBreaks("hello\nworld")).toBe("hello  \nworld");
  });

  test("converts multiple newlines to hard line breaks", () => {
    expect(convertNewlinesToBreaks("a\nb\nc")).toBe("a  \nb  \nc");
  });

  test("does not add extra spaces when trailing spaces already exist", () => {
    expect(convertNewlinesToBreaks("hello  \nworld")).toBe("hello  \nworld");
  });

  test("preserves double newlines as paragraph breaks", () => {
    expect(convertNewlinesToBreaks("hello\n\nworld")).toBe("hello\n\nworld");
  });

  test("returns unchanged string when no newlines", () => {
    expect(convertNewlinesToBreaks("hello world")).toBe("hello world");
  });

  test("returns empty string unchanged", () => {
    expect(convertNewlinesToBreaks("")).toBe("");
  });
});

describe("UserTextContent", () => {
  test("renders ANSI intensity in local command output", () => {
    const markup = renderToStaticMarkup(
      <UserTextContent
        text={
          "<local-command-stdout>Added \u001b[1m/tmp/demo\u001b[22m \u001b[2m· hint\u001b[22m</local-command-stdout>"
        }
      />,
    );

    expect(markup).toContain('<span class="font-bold">/tmp/demo</span>');
    expect(markup).toContain('<span class="opacity-60">· hint</span>');
  });
});
