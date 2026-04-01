// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarkdownContent } from "./MarkdownContent";

vi.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
  }),
}));

vi.mock("react-syntax-highlighter", () => ({
  Prism: ({ children }: { children: string }) => <div>{children}</div>,
}));

describe("MarkdownContent", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  const renderComponent = (content: string) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<MarkdownContent content={content} />);
    });
  };

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it("applies wrapping classes to long inline code", () => {
    renderComponent("`very-long-inline-code-token-without-natural-breakpoints`");

    const code = container?.querySelector("code");

    expect(code).not.toBeNull();
    expect(code?.className).toContain("inline-block");
    expect(code?.className).toContain("max-w-full");
    expect(code?.className).toContain("[overflow-wrap:anywhere]");
  });
});
