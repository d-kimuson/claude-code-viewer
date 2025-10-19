import { QueryClient } from "@tanstack/react-query";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { Toaster } from "../components/ui/sonner";
import { honoClient } from "../lib/api/client";
import { QueryClientProviderWrapper } from "../lib/api/QueryClientProviderWrapper";
import { configQuery } from "../lib/api/queries";
import { LinguiServerProvider } from "../lib/i18n/LinguiServerProvider";
import { SSEProvider } from "../lib/sse/components/SSEProvider";
import { getUserConfigOnServerComponent } from "../server/lib/config/getUserConfigOnServerComponent";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import { SSEEventListeners } from "./components/SSEEventListeners";
import { SyncSessionProcess } from "./components/SyncSessionProcess";

import "./globals.css";

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
  const userConfig = await getUserConfigOnServerComponent();
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: configQuery.queryKey,
    queryFn: configQuery.queryFn,
  });

  const initSessionProcesses = await honoClient.api.cc["session-processes"]
    .$get({})
    .then((response) => response.json());

  return (
    <html lang={userConfig.locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LinguiServerProvider locale={userConfig.locale}>
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
        </LinguiServerProvider>
      </body>
    </html>
  );
}
