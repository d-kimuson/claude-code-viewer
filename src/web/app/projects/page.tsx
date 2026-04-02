import { Trans } from "@lingui/react";
import { InfoIcon, SearchIcon } from "lucide-react";
import { type FC, Suspense, useState } from "react";
import { NotificationBell } from "@/web/app/components/NotificationBell";
import { useSearch } from "@/web/components/SearchProvider";
import { SystemInfoCard } from "@/web/components/SystemInfoCard";
import { Dialog, DialogContent, DialogTitle } from "@/web/components/ui/dialog";
import { ProjectList } from "./components/ProjectList";
import { SetupProjectDialog } from "./components/SetupProjectDialog";

export const ProjectsPage: FC = () => {
  const { openSearch } = useSearch();
  const [isSystemInfoOpen, setIsSystemInfoOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      <header className="h-(--spacing-header-height) flex items-center justify-between px-3 bg-muted/30 border-b border-border/40 text-xs flex-shrink-0 select-none">
        <span className="text-sm font-semibold text-foreground">claude-code-viewer</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsSystemInfoOpen(true)}
            className="w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="System Info"
          >
            <InfoIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={openSearch}
            className="w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Search"
          >
            <SearchIcon className="w-3.5 h-3.5" />
          </button>
          <NotificationBell />
        </div>
      </header>

      <Dialog open={isSystemInfoOpen} onOpenChange={setIsSystemInfoOpen}>
        <DialogContent className="max-w-md h-[70vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">System Info</DialogTitle>
          <Suspense
            fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}
          >
            <SystemInfoCard />
          </Suspense>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <p className="text-muted-foreground">
              <Trans id="projects.page.description" />
            </p>
          </header>

          <main>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  <Trans id="projects.page.title" />
                </h2>
                <SetupProjectDialog />
              </div>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="text-muted-foreground">
                      <Trans id="projects.page.loading" />
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
};
