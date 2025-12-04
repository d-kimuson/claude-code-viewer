import { createRootRoute, Outlet } from "@tanstack/react-router";
import { HelmetProvider } from "react-helmet-async";
import { RootErrorBoundary } from "../app/components/RootErrorBoundary";
import { SSEEventListeners } from "../app/components/SSEEventListeners";
import { SyncSessionProcess } from "../app/components/SyncSessionProcess";
import { SearchProvider } from "../components/SearchProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { Toaster } from "../components/ui/sonner";
import { LinguiClientProvider } from "../lib/i18n/LinguiProvider";
import { SSEProvider } from "../lib/sse/components/SSEProvider";

export const Route = createRootRoute({
  component: () => (
    <RootErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <LinguiClientProvider>
            <SSEProvider>
              <SSEEventListeners>
                <SyncSessionProcess>
                  <SearchProvider>
                    <Outlet />
                  </SearchProvider>
                </SyncSessionProcess>
              </SSEEventListeners>
            </SSEProvider>
          </LinguiClientProvider>
        </ThemeProvider>
      </HelmetProvider>
      <Toaster position="top-right" />
    </RootErrorBoundary>
  ),
});
