import type { ReactNode } from "react";
import { SSEEventListeners } from "../app/components/SSEEventListeners";
import { SyncSessionProcess } from "../app/components/SyncSessionProcess";
import { SSEProvider } from "../lib/sse/components/SSEProvider";
import { useAuth } from "./AuthProvider";

interface AuthenticatedProvidersProps {
  children: ReactNode;
}

/**
 * Wraps children with SSE providers only when authenticated.
 * This prevents SSE connections and API calls when the user is not logged in.
 */
export function AuthenticatedProviders({
  children,
}: AuthenticatedProvidersProps) {
  const { isAuthenticated } = useAuth();

  // When not authenticated or still loading, render children without SSE providers
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // When authenticated, wrap with SSE providers
  return (
    <SSEProvider>
      <SSEEventListeners>
        <SyncSessionProcess>{children}</SyncSessionProcess>
      </SSEEventListeners>
    </SSEProvider>
  );
}
