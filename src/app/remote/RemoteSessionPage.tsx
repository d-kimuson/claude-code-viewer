import { AlertCircle, FileText } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RemoteConversationViewer } from "./components/RemoteConversationViewer";
import { UrlInputForm } from "./components/UrlInputForm";
import { useRemoteSession } from "./hooks/useRemoteSession";

export function RemoteSessionPage() {
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);
  const { conversations, getToolResult, isLoading, isError, error } =
    useRemoteSession(submittedUrl);

  const handleUrlSubmit = (url: string) => {
    setSubmittedUrl(url);
  };

  const handleReset = () => {
    setSubmittedUrl(null);
  };

  // Show form if no URL submitted yet or if there was an error
  if (submittedUrl === null || (isError && conversations.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-lg relative backdrop-blur-sm bg-card/95 border-border/50 shadow-xl animate-in fade-in-0 zoom-in-95 duration-300">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Remote Session Viewer
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter a Supabase JSON URL to view a Claude Code session
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {isError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error loading session</AlertTitle>
                <AlertDescription>
                  {error instanceof Error
                    ? error.message
                    : "Failed to load session"}
                </AlertDescription>
              </Alert>
            )}
            <UrlInputForm onSubmit={handleUrlSubmit} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  // Show conversation viewer
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Remote Session Viewer</h1>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {submittedUrl}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Load different session
          </button>
        </div>
      </header>

      <RemoteConversationViewer
        conversations={conversations}
        getToolResult={getToolResult}
      />
    </div>
  );
}
