// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchDialog } from "./SearchDialog";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/web/lib/api/queries", () => ({
  searchQuery: vi.fn(() => ({ queryKey: ["search"], queryFn: vi.fn() })),
}));

vi.mock("@/web/app/hooks/useConfig", () => ({
  useConfig: () => ({
    config: { locale: "en", searchHotkey: "command-k" },
  }),
}));

vi.mock("@/lib/date/formatLocaleDate", () => ({
  formatLocaleDate: () => "2024-01-01",
}));

vi.mock("@/web/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  Loader2Icon: () => <span data-testid="loader" />,
  MessageSquareIcon: () => <span data-testid="message-icon" />,
  SearchIcon: () => <span data-testid="search-icon" />,
}));

describe("SearchDialog", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  const renderComponent = (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId?: string;
  }) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<SearchDialog {...props} />);
    });
  };

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    vi.clearAllMocks();
  });

  describe("スコープトグル表示制御", () => {
    it("projectId がない場合はスコープトグルを表示しない", () => {
      renderComponent({ open: true, onOpenChange: vi.fn() });
      expect(container?.querySelector("[data-testid='scope-toggle']")).toBeNull();
    });

    it("projectId がある場合はスコープトグルを表示する", () => {
      renderComponent({ open: true, onOpenChange: vi.fn(), projectId: "proj-1" });
      expect(container?.querySelector("[data-testid='scope-toggle']")).not.toBeNull();
    });
  });

  describe("プレースホルダー文言", () => {
    it("projectId なし: 全プロジェクト検索のプレースホルダー", () => {
      renderComponent({ open: true, onOpenChange: vi.fn() });
      const input = container?.querySelector("input");
      expect(input?.placeholder).toContain("Search all projects");
    });

    it("projectId あり・デフォルト(プロジェクト内): このプロジェクト検索のプレースホルダー", () => {
      renderComponent({ open: true, onOpenChange: vi.fn(), projectId: "proj-1" });
      const input = container?.querySelector("input");
      expect(input?.placeholder).toContain("Search this project");
    });
  });

  describe("スコープ切り替え", () => {
    beforeEach(() => {
      renderComponent({ open: true, onOpenChange: vi.fn(), projectId: "proj-1" });
    });

    it("初期状態はプロジェクト内検索", () => {
      const input = container?.querySelector("input");
      expect(input?.placeholder).toContain("Search this project");
    });

    it("トグルクリックで全プロジェクト検索に切り替わる", () => {
      const toggle = container?.querySelector("[data-testid='scope-toggle']");
      if (!(toggle instanceof HTMLElement)) {
        throw new Error("scope-toggle not found");
      }
      act(() => {
        toggle.click();
      });
      const input = container?.querySelector("input");
      expect(input?.placeholder).toContain("Search all projects");
    });

    it("2回クリックで元のプロジェクト内検索に戻る", () => {
      const toggle = container?.querySelector("[data-testid='scope-toggle']");
      if (!(toggle instanceof HTMLElement)) {
        throw new Error("scope-toggle not found");
      }
      act(() => {
        toggle.click();
      });
      act(() => {
        toggle.click();
      });
      const input = container?.querySelector("input");
      expect(input?.placeholder).toContain("Search this project");
    });
  });
});
