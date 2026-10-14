// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { SidebarLayout } from "@/lib/sidebar-layout/schema";
import { ProjectTree } from "./ProjectTree";

const state = vi.hoisted(() => ({
  layout: ((): SidebarLayout => ({ version: 1, order: [], hidden: [], expanded: [] }))(),
  error: ((): Error | null => null)(),
  update: vi.fn(),
  detail: vi.fn(),
}));
vi.mock("@/web/hooks/useSidebarLayout", () => ({
  useSidebarLayout: () => ({
    data: state.layout,
    error: state.error,
    isSaving: false,
    updateLayout: state.update,
  }),
}));
vi.mock("@lingui/react", () => ({
  Trans: ({ id, message }: { id: string; message?: string }) => <span>{message ?? id}</span>,
  useLingui: () => ({ i18n: { _: (value: { id: string; message: string }) => value.message } }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    search,
    ...props
  }: {
    children: ReactNode;
    params: { projectId: string };
    search: { sessionId: string };
    "aria-current"?: "page";
    className?: string;
    onClick?: () => void;
  }) => (
    <a {...props} href={`${params.projectId}/${search.sessionId}`}>
      {children}
    </a>
  ),
}));
vi.mock("@/web/lib/api/queries", () => ({
  projectListQuery: {
    queryKey: ["projects"],
    queryFn: () => ({
      projects: [
        {
          id: "main",
          claudeProjectPath: "main",
          lastModifiedAt: "2026-10-09",
          meta: { projectPath: "/app", sessionCount: 2 },
        },
        {
          id: "work",
          claudeProjectPath: "work",
          lastModifiedAt: "2026-10-10",
          meta: { projectPath: "/app/.claude/worktrees/brave", sessionCount: 2 },
        },
        {
          id: "memory-only",
          claudeProjectPath: "/Users/alice/.claude/projects/-Users-alice-Projects-notes",
          lastModifiedAt: "2026-10-11",
          meta: { projectPath: null, sessionCount: 0 },
        },
      ],
    }),
  },
  projectDetailQuery: (id: string, cursor?: string) => ({
    queryFn: () => {
      state.detail(id, cursor);
      return {
        sessions: [
          {
            id: `${id}${cursor ?? "1"}`,
            lastModifiedAt: id === "work" ? "2026-10-10" : "2026-10-09",
            meta: { customTitle: `${id}${cursor ?? "1"}`, firstUserMessage: null },
          },
        ],
        nextCursor: cursor === undefined ? "2" : undefined,
      };
    },
  }),
}));
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const render = async (active = false) => {
  await act(async () => {
    await Promise.resolve();
    root.render(
      <QueryClientProvider client={client}>
        <ProjectTree {...(active ? { currentProjectId: "work", currentSessionId: "work1" } : {})} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  state.error = null;
  state.layout = { version: 1, order: [], hidden: [], expanded: [] };
  state.update.mockClear();
  state.detail.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(async () => {
  await act(async () => {
    await Promise.resolve();
    root.unmount();
  });
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});
test("groups start collapsed and request no sessions", async () => {
  await render();
  expect(state.detail).not.toHaveBeenCalled();
  expect(container.querySelector('[aria-expanded="false"]')?.textContent).toContain("app");
});
test("active worktree expands locally, merges pages and links to owning projects", async () => {
  await render(true);
  await render(true);
  expect(state.update).not.toHaveBeenCalled();
  expect(state.detail.mock.calls).toEqual([
    ["main", undefined],
    ["work", undefined],
  ]);
  expect([...container.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual([
    "work/work1",
    "main/main1",
  ]);
  expect(container.querySelector('[aria-current="page"]')?.textContent).toContain("brave");
  const more = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "sessions.load.more",
  );
  expect(more).toBeDefined();
  await act(async () => {
    await Promise.resolve();
    more?.click();
  });
  await render(true);
  expect(state.detail.mock.calls).toContainEqual(["main", "2"]);
  expect(state.detail.mock.calls).toContainEqual(["work", "2"]);
  expect(container.querySelectorAll("a")).toHaveLength(4);
});
test("layout errors replace the tree instead of rendering defaults", async () => {
  state.error = new Error("Invalid sidebar layout");
  await render();
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("Invalid sidebar layout");
  expect(container.querySelector("[aria-expanded]")).toBeNull();
  expect(state.detail).not.toHaveBeenCalled();
});
test("hidden groups remain available to unhide without requesting sessions", async () => {
  state.layout.hidden = ["/app"];
  await render();
  expect(container.querySelector("summary")?.textContent).toContain("(1)");
  expect(state.detail).not.toHaveBeenCalled();
});

test("expansion adds the group to the persisted expanded list", async () => {
  await render();
  const expand = container.querySelector('button[aria-expanded="false"]');
  if (!(expand instanceof HTMLButtonElement)) throw new Error("Missing expand control");
  await act(async () => {
    await Promise.resolve();
    expand.click();
  });
  expect(state.update).toHaveBeenCalledOnce();
  expect(state.update.mock.calls[0]?.[0]).toEqual({ ...state.layout, expanded: ["/app"] });
});

test("failed collapse restores the active group's local expansion", async () => {
  await render(true);
  const collapse = container.querySelector('button[aria-expanded="true"]');
  if (!(collapse instanceof HTMLButtonElement)) throw new Error("Missing collapse control");
  state.update.mockImplementationOnce((_layout: SidebarLayout, options: { onError: () => void }) =>
    options.onError(),
  );
  await act(async () => {
    await Promise.resolve();
    collapse.click();
  });
  expect(container.querySelector('button[aria-expanded="true"]')).not.toBeNull();
});

test("groups without sessions are not listed", async () => {
  await render();
  expect(container.textContent).not.toContain("notes");
  expect(
    [...container.querySelectorAll("button[title]")].map((b) => b.getAttribute("title")),
  ).toEqual(["/app"]);
});
