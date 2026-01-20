import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
  ActivityIcon,
  ArrowLeft,
  ChevronUpIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react";
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "../../components/ui/button";
import { activityQuery } from "../../lib/api/queries";
import { useServerEventListener } from "../../lib/sse/hook/useServerEventListener";
import { sseAtom } from "../../lib/sse/store/sseAtom";
import { cn } from "../../lib/utils";
import type { ActivityEntrySSE } from "../../types/sse";
import { ActivityEntryItem, ToolGroup } from "./ActivityEntry";
import { activityFiltersAtom, filterEntries } from "./activityFilterAtoms";
import { FilterPanel } from "./FilterPanel";
import {
  type GroupedEntry,
  groupConsecutiveToolCalls,
  groupEntriesByTime,
} from "./timeGrouping";

// Time group header component
const TimeGroupHeader: FC<{ label: string }> = ({ label }) => (
  <div className="sticky top-0 z-[5] bg-muted/80 backdrop-blur-sm px-4 py-1.5 border-b border-border">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
  </div>
);

// Grouped entry renderer
const GroupedEntryRenderer: FC<{
  groupedEntry: GroupedEntry;
  onProjectClick: (projectId: string) => void;
}> = ({ groupedEntry, onProjectClick }) => {
  if (groupedEntry.type === "single") {
    return (
      <ActivityEntryItem
        entry={groupedEntry.entry}
        onProjectClick={onProjectClick}
      />
    );
  }
  return (
    <ToolGroup entries={groupedEntry.entries} onProjectClick={onProjectClick} />
  );
};

export const ActivityFeed: FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [localEntries, setLocalEntries] = useState<ActivityEntrySSE[]>([]);
  const [pausedEntryCount, setPausedEntryCount] = useState(0);
  const [sseState] = useAtom(sseAtom);
  const [filters, setFilters] = useAtom(activityFiltersAtom);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { data, isLoading } = useQuery(activityQuery(100));

  // Mobile detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Listen for real-time activity events
  useServerEventListener("activityEntry", (event) => {
    if (isPaused) {
      setPausedEntryCount((prev) => prev + 1);
    } else {
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
    setIsPaused((prev) => {
      if (prev) {
        // Resuming - reset paused count
        setPausedEntryCount(0);
      }
      return !prev;
    });
  }, []);

  // Merge local entries with initial data, removing duplicates
  const allEntries = useMemo(() => {
    const initialEntries = data?.entries ?? [];
    const combined = [...localEntries, ...initialEntries];
    const seen = new Set<string>();
    return combined.filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  }, [localEntries, data?.entries]);

  // Apply filters
  const filteredEntries = useMemo(
    () => filterEntries(allEntries, filters),
    [allEntries, filters],
  );

  // Group by time
  const timeGroups = useMemo(
    () => groupEntriesByTime(filteredEntries),
    [filteredEntries],
  );

  // Group consecutive tool calls within each time group
  const groupedTimeGroups = useMemo(() => {
    return timeGroups.map((group) => ({
      ...group,
      groupedEntries: groupConsecutiveToolCalls(group.entries),
    }));
  }, [timeGroups]);

  const handleProjectClick = useCallback(
    (projectId: string) => {
      // Filter by this project
      setFilters({ projectId });
    },
    [setFilters],
  );

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
              {/* Connection status indicator */}
              <div className="flex items-center gap-1.5 ml-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    sseState.isConnected
                      ? "bg-green-500 animate-pulse"
                      : "bg-red-500",
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {sseState.isConnected ? "Live" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* New entries badge when paused */}
            {isPaused && pausedEntryCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  togglePause();
                  scrollToTop();
                }}
                className="gap-1.5 animate-pulse"
              >
                <ChevronUpIcon className="h-4 w-4" />
                {pausedEntryCount} new
              </Button>
            )}
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
        </div>
      </header>

      {/* Filter panel */}
      <FilterPanel entries={allEntries} isMobile={isMobile} />

      {/* Feed content */}
      <main ref={scrollContainerRef} className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-muted-foreground">Loading activity...</div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <ActivityIcon className="h-8 w-8 text-muted-foreground/50" />
            {allEntries.length === 0 ? (
              <>
                <p className="text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Activity will appear here as Claude Code sessions run
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">No matching entries</p>
                <p className="text-xs text-muted-foreground/70">
                  Try adjusting your filters
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() =>
                    setFilters({
                      projectId: null,
                      entryTypes: [],
                      searchQuery: "",
                    })
                  }
                >
                  Clear all filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <div>
            {groupedTimeGroups.map((group) => (
              <div key={group.key}>
                <TimeGroupHeader label={group.label} />
                <div className="divide-y divide-border">
                  {group.groupedEntries.map((groupedEntry, idx) => (
                    <GroupedEntryRenderer
                      key={
                        groupedEntry.type === "single"
                          ? groupedEntry.entry.id
                          : `tool-group-${group.key}-${idx}`
                      }
                      groupedEntry={groupedEntry}
                      onProjectClick={handleProjectClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
