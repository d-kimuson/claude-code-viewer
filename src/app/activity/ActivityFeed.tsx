import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ActivityIcon, ArrowLeft, PauseIcon, PlayIcon } from "lucide-react";
import { type FC, useCallback, useState } from "react";
import { Button } from "../../components/ui/button";
import { activityQuery } from "../../lib/api/queries";
import { useServerEventListener } from "../../lib/sse/hook/useServerEventListener";
import type { ActivityEntrySSE } from "../../types/sse";
import { ActivityEntryItem } from "./ActivityEntry";

export const ActivityFeed: FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [localEntries, setLocalEntries] = useState<ActivityEntrySSE[]>([]);

  const { data, isLoading } = useQuery(activityQuery(100));

  // Listen for real-time activity events
  useServerEventListener("activityEntry", (event) => {
    if (!isPaused) {
      setLocalEntries((prev) => {
        // Prevent duplicates by checking ID
        if (prev.some((e) => e.id === event.entry.id)) {
          return prev;
        }
        // Keep only the most recent 100 entries
        return [event.entry, ...prev].slice(0, 100);
      });
    }
  });

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Merge local entries with initial data, removing duplicates
  const allEntries = (() => {
    const initialEntries = data?.entries ?? [];
    const combined = [...localEntries, ...initialEntries];
    const seen = new Set<string>();
    return combined.filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  })();

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/projects">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-lg font-semibold">Activity Feed</h1>
            </div>
          </div>
          <Button
            variant={isPaused ? "default" : "outline"}
            size="sm"
            onClick={togglePause}
            className="gap-2"
          >
            {isPaused ? (
              <>
                <PlayIcon className="h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <PauseIcon className="h-4 w-4" />
                Pause
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Feed content */}
      <main className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-muted-foreground">Loading activity...</div>
          </div>
        ) : allEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <ActivityIcon className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/70">
              Activity will appear here as Claude Code sessions run
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allEntries.map((entry) => (
              <ActivityEntryItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
