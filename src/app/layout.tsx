import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "../components/ui/sonner";
import { QueryClientProviderWrapper } from "../lib/api/QueryClientProviderWrapper";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import { ServerEventsProvider } from "./components/ServerEventsProvider";

import "./globals.css";
import { QueryClient } from "@tanstack/react-query";
import { configQueryConfig } from "./hooks/useConfig";

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

export const metadata: Metadata = {
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
    ...configQueryConfig,
  });

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RootErrorBoundary>
          <QueryClientProviderWrapper>
            <ServerEventsProvider>{children}</ServerEventsProvider>
          </QueryClientProviderWrapper>
        </RootErrorBoundary>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
