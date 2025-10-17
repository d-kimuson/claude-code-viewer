"use client";

import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProjectErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="size-6 text-destructive" />
            <div>
              <CardTitle>Failed to load project</CardTitle>
              <CardDescription>
                We encountered an error while loading this project
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription>
              <code className="text-xs">{error.message}</code>
              {error.digest && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Error ID: {error.digest}
                </div>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={reset} variant="default">
              <RefreshCw />
              Try Again
            </Button>
            <Button onClick={() => router.push("/projects")} variant="outline">
              <ArrowLeft />
              Back to Projects
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
