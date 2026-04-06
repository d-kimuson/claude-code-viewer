import { describe, expect, test } from "vitest";
import { convertNewlinesToBreaks } from "./UserTextContent";

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
