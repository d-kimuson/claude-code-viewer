import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { RootErrorBoundary } from "../app/components/RootErrorBoundary";
import { SSEEventListeners } from "../app/components/SSEEventListeners";
import { Toaster } from "../components/ui/sonner";
import { QueryClientProviderWrapper } from "../lib/api/QueryClientProviderWrapper";
import { LinguiClientProvider } from "../lib/i18n/LinguiProvider";
import { SSEProvider } from "../lib/sse/components/SSEProvider";

export const Route = createRootRoute({
  component: () => (
    <RootErrorBoundary>
      <QueryClientProviderWrapper>
        <LinguiClientProvider>
          <SSEProvider>
            <SSEEventListeners>
              <Outlet />
              <TanStackDevtools
                config={{
                  position: "bottom-right",
                }}
                plugins={[
                  {
                    name: "Tanstack Router",
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                ]}
              />
            </SSEEventListeners>
          </SSEProvider>
        </LinguiClientProvider>
      </QueryClientProviderWrapper>
      <Toaster position="top-right" />
    </RootErrorBoundary>
  ),
});
