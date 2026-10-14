// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { defaultSidebarLayout, type SidebarLayout } from "@/lib/sidebar-layout/schema";
import { useSidebarLayout } from "./useSidebarLayout";
const mocks = vi.hoisted(() => ({ put: vi.fn(), error: vi.fn(), query: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
vi.mock("@/web/lib/api/client", () => ({
  honoClient: { api: { "sidebar-layout": { $put: mocks.put } } },
}));
vi.mock("@/web/lib/api/queries", () => ({
  sidebarLayoutQuery: { queryKey: ["sidebar-layout"], queryFn: mocks.query },
}));
test.each(["network", "server", "validation"])(
  "failed %s PUT rolls back optimistic state and reports the error",
  async (failure) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const initial = defaultSidebarLayout();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["sidebar-layout"], initial);
    mocks.error.mockClear();
    mocks.query.mockResolvedValue(initial);
    let finishPut: () => void = () => {
      throw new Error("PUT has not started");
    };
    mocks.put.mockImplementation(
      () =>
        new Promise<Response>((resolve, reject) => {
          finishPut = () => {
            if (failure === "network") reject(new Error("Disk write failed"));
            else
              resolve(
                new Response(
                  JSON.stringify(
                    failure === "server"
                      ? { message: "Disk write failed" }
                      : { error: "Too many entries" },
                  ),
                  { status: failure === "server" ? 500 : 400 },
                ),
              );
          };
        }),
    );
    const container = document.createElement("div");
    const root = createRoot(container);
    const edited: SidebarLayout = { ...initial, hidden: ["/app"] };
    const Probe = () => {
      const layout = useSidebarLayout();
      return <button onClick={() => layout.updateLayout(edited)}>Save</button>;
    };
    try {
      await act(async () => {
        await Promise.resolve();
        root.render(
          <QueryClientProvider client={client}>
            <Probe />
          </QueryClientProvider>,
        );
      });
      await act(async () => {
        await Promise.resolve();
        container.querySelector("button")?.click();
      });
      expect(client.getQueryData(["sidebar-layout"])).toEqual(edited);
      await act(async () => {
        await Promise.resolve();
        finishPut();
      });
      expect(client.getQueryData(["sidebar-layout"])).toEqual(initial);
      expect(mocks.error).toHaveBeenCalledWith(
        failure === "validation"
          ? 'Sidebar layout request failed (HTTP 400): {"error":"Too many entries"}'
          : "Disk write failed",
      );
    } finally {
      await act(async () => {
        await Promise.resolve();
        root.unmount();
      });
      client.clear();
      vi.unstubAllGlobals();
    }
  },
);
