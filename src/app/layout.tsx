import { QueryClient } from "@tanstack/react-query";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { Toaster } from "../components/ui/sonner";
import { QueryClientProviderWrapper } from "../lib/api/QueryClientProviderWrapper";
import { SSEProvider } from "../lib/sse/components/SSEProvider";
import { RootErrorBoundary } from "./components/RootErrorBoundary";

import "./globals.css";
import { honoClient } from "../lib/api/client";
import { configQuery } from "../lib/api/queries";
import { SSEEventListeners } from "./components/SSEEventListeners";
import { SyncSessionProcess } from "./components/SyncSessionProcess";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
