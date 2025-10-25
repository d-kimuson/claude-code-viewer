import { QueryClient } from "@tanstack/react-query";

import { Toaster } from "../components/ui/sonner";
import { honoClient } from "../lib/api/client";
import { QueryClientProviderWrapper } from "../lib/api/QueryClientProviderWrapper";
import { configQuery } from "../lib/api/queries";
import { SSEProvider } from "../lib/sse/components/SSEProvider";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import { SSEEventListeners } from "./components/SSEEventListeners";
import { SyncSessionProcess } from "./components/SyncSessionProcess";

import "./globals.css";

export const metadata = {
  title: "Claude Code Viewer",
  description: "Web Viewer for Claude Code history",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: configQuery.queryKey,
    queryFn: configQuery.queryFn,
  });

  const initSessionProcesses = await honoClient.api.cc["session-processes"]
    .$get({})
    .then((response) => response.json());

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootErrorBoundary>
          <QueryClientProviderWrapper>
            <SSEProvider>
              <SSEEventListeners>
                <SyncSessionProcess
                  initProcesses={initSessionProcesses.processes}
                >
                  {children}
                </SyncSessionProcess>
              </SSEEventListeners>
            </SSEProvider>
          </QueryClientProviderWrapper>
        </RootErrorBoundary>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
