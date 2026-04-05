// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeBlock } from "./CodeBlock";

vi.mock("@lingui/react", () => ({
  useLingui: () => ({
    i18n: {
      _: (input: string | { id?: string; message?: string }) =>
        typeof input === "string" ? input : (input.message ?? input.id ?? ""),
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-syntax-highlighter/dist/esm/prism-light", () => {
  const mockComponent = ({ children }: { children: string }) => <div>{children}</div>;
  Object.assign(mockComponent, { registerLanguage: vi.fn() });
  return { default: mockComponent };
});

describe("CodeBlock", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  const defaultProps = {
    language: "typescript",
    code: "const x = 1;\nconsole.log(x);\n",
    syntaxTheme: {},
  };

  const renderComponent = (props = defaultProps) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<CodeBlock {...props} />);
    });
  };

  const mockWriteText = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    vi.useFakeTimers();
    mockWriteText.mockClear();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    vi.useRealTimers();
  });

  it("renders the code block with language name and copy button", () => {
    renderComponent();

    const languageLabel = container?.querySelector("span");
    expect(languageLabel?.textContent).toBe("typescript");

    const button = container?.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-label")).toBe("Copy code");
  });

  it("calls navigator.clipboard.writeText with the code content on copy button click", async () => {
    renderComponent();

    const button = container?.querySelector("button");
    expect(button).not.toBeNull();

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(mockWriteText).toHaveBeenCalledWith(defaultProps.code);
  });

  it("shows CheckIcon after successful copy", async () => {
    renderComponent();

    const button = container?.querySelector("button");

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    // After successful copy, the button should contain CheckIcon (svg with a polyline, not a path with rect)
    const svg = button?.querySelector("svg");
    expect(svg).not.toBeNull();
    // CheckIcon has class containing "lucide-check", CopyIcon has "lucide-copy"
    expect(svg?.classList.toString()).toContain("lucide-check");
  });

  it("shows success toast after successful copy", async () => {
    const { toast } = await import("sonner");

    renderComponent();

    const button = container?.querySelector("button");

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(toast.success).toHaveBeenCalledWith("Code copied");
  });

  it("shows error toast after clipboard write failure", async () => {
    mockWriteText.mockImplementationOnce(() => Promise.reject(new Error("Clipboard error")));
    const { toast } = await import("sonner");

    renderComponent();

    const button = container?.querySelector("button");

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to copy code");
  });

  it("resets copied state back to CopyIcon after 2000ms", async () => {
    renderComponent();

    const button = container?.querySelector("button");

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    // Should show CheckIcon now
    let svg = button?.querySelector("svg");
    expect(svg?.classList.toString()).toContain("lucide-check");

    // Advance timer by 2000ms
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should reset back to CopyIcon
    svg = button?.querySelector("svg");
    expect(svg?.classList.toString()).toContain("lucide-copy");
  });
});
