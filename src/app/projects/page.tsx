"use client";

import { HistoryIcon } from "lucide-react";
import { Suspense } from "react";
import { GlobalSidebar } from "@/components/GlobalSidebar";
import { CreateProjectDialog } from "./components/CreateProjectDialog";
import { ProjectList } from "./components/ProjectList";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ProjectsPage() {
  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
      <GlobalSidebar className="hidden md:flex" />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <HistoryIcon className="w-8 h-8" />
              Claude Code Viewer
            </h1>
            <p className="text-muted-foreground">
              Browse your Claude Code conversation history and project
              interactions
            </p>
          </header>

          <main>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Your Projects</h2>
                <CreateProjectDialog />
              </div>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="text-muted-foreground">
                      Loading projects...
                    </div>
                  </div>
                }
              >
                <ProjectList />
              </Suspense>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
