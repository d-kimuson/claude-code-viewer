import { QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "../components/ui/sonner";
import { QueryClientProviderWrapper } from "../lib/api/QueryClientProviderWrapper";
import { SSEProvider } from "../lib/sse/components/SSEProvider";
import { RootErrorBoundary } from "./components/RootErrorBoundary";

import "./globals.css";
import { configQuery } from "../lib/api/queries";
import { SSEEventListeners } from "./components/SSEEventListeners";

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
    queryKey: configQuery.queryKey,
    queryFn: configQuery.queryFn,
  });

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RootErrorBoundary>
          <QueryClientProviderWrapper>
            <SSEProvider>
              <SSEEventListeners>{children}</SSEEventListeners>
            </SSEProvider>
          </QueryClientProviderWrapper>
        </RootErrorBoundary>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
