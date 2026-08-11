import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { AnsiText } from "@/web/app/projects/[projectId]/sessions/[sessionId]/components/conversationList/AnsiText";

describe("AnsiText", () => {
  test("renders bold and dim text as React spans", () => {
    const markup = renderToStaticMarkup(
      <AnsiText text={"normal\u001b[1mbold\u001b[22m\u001b[2mdim\u001b[22m"} />,
    );

    expect(markup).toContain('<span class="font-bold">bold</span>');
    expect(markup).toContain('<span class="opacity-60">dim</span>');
    expect(markup).not.toContain("[1m");
    expect(markup).not.toContain("[2m");
  });

  test("escapes text instead of interpreting it as HTML", () => {
    const markup = renderToStaticMarkup(
      <AnsiText text={"\u001b[1m<img src=x onerror=alert(1)>\u001b[0m"} />,
    );

    expect(markup).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(markup).not.toContain("<img");
  });
});
