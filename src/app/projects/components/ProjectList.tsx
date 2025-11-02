import { Trans } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import { FolderIcon } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLocaleDate } from "../../../lib/date/formatLocaleDate";
import { useConfig } from "../../hooks/useConfig";
import { useProjects } from "../hooks/useProjects";

export const ProjectList: FC = () => {
  const {
    data: { projects },
  } = useProjects();
  const { config } = useConfig();

  if (projects.length === 0) {
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <FolderIcon className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">
          <Trans id="project_list.no_projects.title" />
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          <Trans id="project_list.no_projects.description" />
        </p>
      </CardContent>
    </Card>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Card key={project.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderIcon className="w-5 h-5" />
              <span className="truncate">
                {project.meta.projectName ?? project.claudeProjectPath}
              </span>
            </CardTitle>
            {project.meta.projectPath ? (
              <CardDescription>{project.meta.projectPath}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <Trans id="project_list.last_modified" />{" "}
              {project.lastModifiedAt
                ? formatLocaleDate(project.lastModifiedAt, {
                    locale: config.locale,
                    target: "time",
                  })
                : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              <Trans id="project_list.messages" /> {project.meta.sessionCount}
            </p>
          </CardContent>
          <CardContent className="pt-0">
            <Button asChild className="w-full">
              <Link
                to={"/projects/$projectId/latest"}
                params={{ projectId: project.id }}
              >
                <Trans id="project_list.view_conversations" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
