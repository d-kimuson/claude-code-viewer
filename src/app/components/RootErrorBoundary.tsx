import { AlertCircle, Home, RefreshCw } from "lucide-react";
import type { FC, PropsWithChildren } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const RootErrorBoundary: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="size-6 text-destructive" />
                <div>
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription>
                    An unexpected error occurred in the application
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
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={resetErrorBoundary} variant="default">
                  <RefreshCw />
                  Try Again
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = "/";
                  }}
                  variant="outline"
                >
                  <Home />
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};
