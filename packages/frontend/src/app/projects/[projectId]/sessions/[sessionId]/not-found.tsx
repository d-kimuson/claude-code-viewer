import { Link } from "@tanstack/react-router";
import { MessageCircleOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SessionNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageCircleOff className="size-6 text-muted-foreground" />
            <div>
              <CardTitle>Session Not Found</CardTitle>
              <CardDescription>
                The conversation session you are looking for does not exist or
                has been removed
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button asChild variant="default">
              <Link to="/projects">
                <MessageCircleOff />
                Back to Projects
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
