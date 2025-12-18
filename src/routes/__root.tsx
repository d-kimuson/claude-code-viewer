import { createRootRoute, Outlet } from "@tanstack/react-router";
import { HelmetProvider } from "react-helmet-async";
import { BrowserPreviewProvider } from "../app/components/BrowserPreviewProvider";
import { RootErrorBoundary } from "../app/components/RootErrorBoundary";
import { AuthenticatedProviders } from "../components/AuthenticatedProviders";
import { AuthProvider } from "../components/AuthProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { Toaster } from "../components/ui/sonner";
import { LinguiClientProvider } from "../lib/i18n/LinguiProvider";

export const Route = createRootRoute({
  component: () => (
    <RootErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <AuthProvider>
            <LinguiClientProvider>
              <AuthenticatedProviders>
                <BrowserPreviewProvider>
                  <Outlet />
                </BrowserPreviewProvider>
              </AuthenticatedProviders>
            </LinguiClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
      <Toaster position="top-right" />
    </RootErrorBoundary>
  ),
});
