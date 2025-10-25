"use client";

import { Trans } from "@lingui/react";
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
              <CardTitle>
                <Trans
                  id="project.error.title"
                  message="Failed to load project"
                />
              </CardTitle>
              <CardDescription>
                <Trans
                  id="project.error.description"
                  message="We encountered an error while loading this project"
                />
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>
              <Trans id="project.error.details_title" message="Error Details" />
            </AlertTitle>
            <AlertDescription>
              <code className="text-xs">{error.message}</code>
              {error.digest && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <Trans id="project.error.error_id" message="Error ID:" />{" "}
                  {error.digest}
                </div>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={reset} variant="default">
              <RefreshCw />
              <Trans id="project.error.try_again" message="Try Again" />
            </Button>
            <Button onClick={() => router.push("/projects")} variant="outline">
              <ArrowLeft />
              <Trans
                id="project.error.back_to_projects"
                message="Back to Projects"
              />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
