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

vi.mock("react-syntax-highlighter/dist/esm/prism-light", () => {
  const mockComponent = ({ children }: { children: string }) => <div>{children}</div>;
  Object.assign(mockComponent, { registerLanguage: vi.fn() });

  return {
    default: mockComponent,
  };
});

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

  it("renders inline math with KaTeX", () => {
    renderComponent("The mass-energy relation is $E = mc^2$.");

    const katex = container?.querySelector(".katex");

    expect(katex).not.toBeNull();
  });

  it("renders single-line $$...$$ as display math", () => {
    // Claude Code emits display equations on a single line.
    renderComponent("$$\\mathcal{L}_{\\text{pre}} = \\text{MSE}(\\hat{X}, X)$$");

    const displayMath = container?.querySelector(".katex-display");

    expect(displayMath).not.toBeNull();
  });

  it("does not rewrite $$ inside code spans", () => {
    renderComponent("Use `$$value$$` as a placeholder.");

    expect(container?.querySelector(".katex")).toBeNull();
    expect(container?.textContent).toContain("$$value$$");
  });
});
