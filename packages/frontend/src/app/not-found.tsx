import { FileQuestion, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileQuestion className="size-6 text-muted-foreground" />
            <div>
              <CardTitle>Page Not Found</CardTitle>
              <CardDescription>
                The page you are looking for does not exist
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button asChild variant="default">
              {/* TODO: Soft Navigation */}
              <a href="/">
                <Home />
                Go to Home
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
