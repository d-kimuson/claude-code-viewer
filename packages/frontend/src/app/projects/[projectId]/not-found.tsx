import { Trans } from "@lingui/react";
import { FolderSearch, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProjectNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FolderSearch className="size-6 text-muted-foreground" />
            <div>
              <CardTitle>
                <Trans
                  id="project.not_found.title"
                  message="Project Not Found"
                />
              </CardTitle>
              <CardDescription>
                <Trans
                  id="project.not_found.description"
                  message="The project you are looking for does not exist or has been removed"
                />
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button asChild variant="default">
              <Link href="/projects">
                <Home />
                <Trans
                  id="project.not_found.back_to_projects"
                  message="Back to Projects"
                />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
