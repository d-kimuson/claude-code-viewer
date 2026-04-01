/// <reference types="vitest" />
/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiffViewer } from "./DiffViewer";
import type { FileDiff } from "./types";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DiffViewer", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  const fileDiff: FileDiff = {
    filename: "src/example.ts",
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    isBinary: false,
    linesAdded: 1,
    linesDeleted: 1,
    hunks: [
      {
        oldStart: 1,
        newStart: 1,
        lines: [
          {
            type: "deleted",
            oldLineNumber: 1,
            content: "before",
          },
          {
            type: "added",
            newLineNumber: 1,
            content:
              "after-with-a-very-long-line-that-should-expand-the-scrollable-surface",
          },
        ],
      },
      {
        oldStart: 10,
        newStart: 10,
        lines: [
          {
            type: "unchanged",
            oldLineNumber: 10,
            newLineNumber: 10,
            content: "const example = true;",
          },
          {
            type: "added",
            newLineNumber: 11,
            content:
              "const secondHunk = 'also-needs-the-same-horizontal-scroll-surface';",
          },
        ],
      },
    ],
  };

  const renderComponent = () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<DiffViewer fileDiff={fileDiff} />);
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

  it("renders rows with monospace layout classes for diff content", () => {
    renderComponent();

    const scrollSurface = container?.querySelector(".inline-block.min-w-full");
    const scrollContainers = container?.querySelectorAll(".overflow-x-auto");
    const rows = container?.querySelectorAll("[data-slot='diff-row']");
    const contentRows = container?.querySelectorAll(
      "[data-slot='diff-row-content']",
    );
    const gutter = container?.querySelector(".w-20.shrink-0");
    const contentText = contentRows?.[1]?.querySelector("span:last-child");

    expect(scrollSurface).not.toBeNull();
    expect(scrollSurface?.className).toContain("w-max");
    expect(scrollContainers?.length).toBe(1);
    expect(gutter).not.toBeNull();
    expect(rows?.length).toBe(4);
    expect(contentRows?.length).toBe(4);
    expect(contentRows?.[0]?.className).toContain("[font-family:");
    expect(rows?.[0]?.className).toContain("min-w-full");
    expect(contentText?.className).toContain("w-max");
    expect(contentText?.className).toContain("min-w-full");
  });

  it("renders diff signs in a dedicated aligned column", () => {
    renderComponent();

    const signs = container?.querySelectorAll("[data-slot='diff-sign']");

    expect(signs?.[0]?.textContent).toBe("-");
    expect(signs?.[1]?.textContent).toBe("+");
    expect(signs?.[3]?.textContent).toBe("+");
    expect(signs?.[0]?.className).toContain("w-4");
    expect(signs?.[0]?.className).toContain("text-center");
  });
});
