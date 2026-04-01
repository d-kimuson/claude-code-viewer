import { createRootRoute, Outlet } from "@tanstack/react-router";
import { LinguiClientProvider } from "@/lib/i18n/LinguiProvider";
import { LayoutPanelsProvider } from "@/web/app/components/LayoutPanelsProvider";
import { RootErrorBoundary } from "@/web/app/components/RootErrorBoundary";
import { AuthenticatedProviders } from "../components/AuthenticatedProviders";
import { AuthProvider } from "../components/AuthProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { Toaster } from "../components/ui/sonner";

export const Route = createRootRoute({
  component: () => (
    <RootErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LinguiClientProvider>
            <AuthenticatedProviders>
              <LayoutPanelsProvider>
                <Outlet />
              </LayoutPanelsProvider>
            </AuthenticatedProviders>
          </LinguiClientProvider>
        </AuthProvider>
      </ThemeProvider>
      <Toaster position="top-right" />
    </RootErrorBoundary>
  ),
});
