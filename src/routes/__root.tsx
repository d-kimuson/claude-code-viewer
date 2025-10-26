import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { RootErrorBoundary } from "../app/components/RootErrorBoundary";
import { SSEEventListeners } from "../app/components/SSEEventListeners";
import { SyncSessionProcess } from "../app/components/SyncSessionProcess";
import { ThemeProvider } from "../components/ThemeProvider";
import { Toaster } from "../components/ui/sonner";
import { LinguiClientProvider } from "../lib/i18n/LinguiProvider";
import { SSEProvider } from "../lib/sse/components/SSEProvider";

export const Route = createRootRoute({
  component: () => (
    <RootErrorBoundary>
      <ThemeProvider>
        <LinguiClientProvider>
          <SSEProvider>
            <SSEEventListeners>
              <SyncSessionProcess>
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
              </SyncSessionProcess>
            </SSEEventListeners>
          </SSEProvider>
        </LinguiClientProvider>
      </ThemeProvider>
      <Toaster position="top-right" />
    </RootErrorBoundary>
  ),
});
