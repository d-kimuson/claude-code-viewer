"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  FolderIcon,
  MessageSquareIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SettingsControls } from "@/components/SettingsControls";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useConfig } from "../../../hooks/useConfig";
import { projectQueryConfig, useProject } from "../hooks/useProject";
import { firstCommandToTitle } from "../services/firstCommandToTitle";
import { NewChatModal } from "./newChat/NewChatModal";

export const ProjectPageContent = ({ projectId }: { projectId: string }) => {
  const {
    data: { project, sessions },
  } = useProject(projectId);
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: invalidate when config changed
  useEffect(() => {
    void queryClient.invalidateQueries({
      queryKey: projectQueryConfig(projectId).queryKey,
    });
  }, [config.hideNoUserMessageSession, config.unifySameTitleSession]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
      <header className="mb-6 sm:mb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/projects" className="flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Projects</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <FolderIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words overflow-hidden">
              {project.meta.projectPath ?? project.claudeProjectPath}
            </h1>
          </div>
          <div className="flex-shrink-0">
            <NewChatModal
              projectId={projectId}
              trigger={
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Start New Chat</span>
                  <span className="sm:hidden">New Chat</span>
                </Button>
              }
            />
          </div>
        </div>
        <p className="text-muted-foreground font-mono text-xs sm:text-sm break-all">
          History File: {project.claudeProjectPath ?? "unknown"}
        </p>
      </header>

      <main>
        <section>
          <h2 className="text-lg sm:text-xl font-semibold mb-4">
            Conversation Sessions{" "}
            {sessions.length > 0 ? `(${sessions.length})` : ""}
          </h2>

          {/* Filter Controls */}
          <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <div className="mb-6">
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between mb-2 h-auto py-3"
                >
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4" />
                    <span className="font-medium">Filter Settings</span>
                    <span className="text-xs text-muted-foreground">
                      ({sessions.length} sessions)
                    </span>
                  </div>
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${
                      isSettingsOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <SettingsControls openingProjectId={projectId} />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquareIcon className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No sessions found</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  No conversation sessions found for this project. Start a
                  conversation with Claude Code in this project to create
                  sessions.
                </p>
                <NewChatModal
                  projectId={projectId}
                  trigger={
                    <Button size="lg" className="gap-2">
                      <PlusIcon className="w-5 h-5" />
                      Start First Chat
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="break-words overflow-ellipsis line-clamp-2 text-lg sm:text-xl">
                        {session.meta.firstCommand !== null
                          ? firstCommandToTitle(session.meta.firstCommand)
                          : session.id}
                      </span>
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {session.id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {session.meta.messageCount} messages
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last modified:{" "}
                      {session.meta.lastModifiedAt
                        ? new Date(
                            session.meta.lastModifiedAt,
                          ).toLocaleDateString()
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {session.jsonlFilePath}
                    </p>
                  </CardContent>
                  <CardContent className="pt-0">
                    <Button asChild className="w-full">
                      <Link
                        href={`/projects/${projectId}/sessions/${encodeURIComponent(
                          session.id,
                        )}`}
                      >
                        View Session
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
