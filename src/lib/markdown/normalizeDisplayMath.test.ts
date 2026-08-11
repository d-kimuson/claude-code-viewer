import { describe, expect, test } from "vitest";
import { normalizeDisplayMath } from "./normalizeDisplayMath";

describe("normalizeDisplayMath", () => {
  test("moves standalone single-line display math delimiters onto their own lines", () => {
    expect(normalizeDisplayMath("$$ x + y $$")).toBe("\n\n$$\nx + y\n$$\n\n");
  });

  test("supports escaped dollar signs inside display math", () => {
    expect(normalizeDisplayMath("$$\\text{Price: \\$5}$$")).toBe(
      "\n\n$$\n\\text{Price: \\$5}\n$$\n\n",
    );
  });

  test("leaves multiline display math unchanged", () => {
    expect(normalizeDisplayMath("$$\nx + y\n$$")).toBe("$$\nx + y\n$$");
  });

  test.each([
    "Use `$$value$$` as a placeholder.",
    "Use ``$$value$$`` as a placeholder.",
    "Inline prose with $$value$$ in the sentence.",
    "[$$label$$](https://example.com/$$path$$)",
    "- $$value$$",
    "1. $$value$$",
    "> $$value$$",
    "  $$value$$",
    "```text\n$$value$$\n```",
    "````text\n```\n$$value$$\n````",
    "~~~text\n$$value$$\n~~~",
    "> ```text\n> $$value$$\n> ```",
    "- ```text\n  $$value$$\n  ```",
  ])("does not normalize math in inline or container-sensitive Markdown: %s", (content) => {
    expect(normalizeDisplayMath(content)).toBe(content);
  });

  test("does not treat a fence marker in indented code as an open fence", () => {
    expect(normalizeDisplayMath("    ```\n    literal\n$$value$$")).toBe(
      "    ```\n    literal\n\n\n$$\nvalue\n$$\n\n",
    );
  });

  test("leaves unmatched, escaped, and multiple delimiters unchanged", () => {
    expect(normalizeDisplayMath("before $$value after")).toBe("before $$value after");
    expect(normalizeDisplayMath("$$value\\$$")).toBe("$$value\\$$");
    expect(normalizeDisplayMath("$$a$$ and $$b$$")).toBe("$$a$$ and $$b$$");
  });
});
