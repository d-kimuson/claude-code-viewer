import { useAtom } from "jotai";
import {
  BotIcon,
  ChevronDownIcon,
  FilterIcon,
  MessageSquareIcon,
  SearchIcon,
  SettingsIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { cn } from "../../lib/utils";
import type { ActivityEntrySSE } from "../../types/sse";
import {
  activityFiltersAtom,
  type EntryTypeFilter,
  getUniqueProjects,
} from "./activityFilterAtoms";

interface FilterPanelProps {
  entries: ActivityEntrySSE[];
  isMobile?: boolean;
}

const ENTRY_TYPES: Array<{
  value: EntryTypeFilter;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    value: "user",
    label: "User",
    icon: <MessageSquareIcon className="h-3 w-3" />,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    value: "assistant",
    label: "Assistant",
    icon: <BotIcon className="h-3 w-3" />,
    color:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  {
    value: "tool",
    label: "Tool",
    icon: <WrenchIcon className="h-3 w-3" />,
    color:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  },
  {
    value: "system",
    label: "System",
    icon: <SettingsIcon className="h-3 w-3" />,
    color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30",
  },
];

function extractProjectName(projectId: string): string {
  try {
    const decoded = atob(projectId);
    const lastSegment = decoded.split("/").pop() || "";
    const parts = lastSegment.split("-").filter(Boolean);
    if (parts.length >= 2) {
      const repoName = parts[parts.length - 1];
      if (repoName && repoName.length <= 3 && parts.length >= 2) {
        return `${parts[parts.length - 2]}-${repoName}`;
      }
      return repoName || projectId.slice(0, 8);
    }
    return lastSegment.slice(0, 20) || projectId.slice(0, 8);
  } catch {
    return projectId.slice(0, 8);
  }
}

export const FilterPanel: FC<FilterPanelProps> = ({
  entries,
  isMobile = false,
}) => {
  const [filters, setFilters] = useAtom(activityFiltersAtom);
  const [isOpen, setIsOpen] = useState(!isMobile);

  const projects = useMemo(() => getUniqueProjects(entries), [entries]);

  const toggleEntryType = (type: EntryTypeFilter) => {
    const current = filters.entryTypes;
    const newTypes = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFilters({ entryTypes: newTypes });
  };

  const clearFilters = () => {
    setFilters({
      projectId: null,
      entryTypes: [],
      searchQuery: "",
    });
  };

  const hasActiveFilters =
    filters.projectId !== null ||
    filters.entryTypes.length > 0 ||
    filters.searchQuery !== "";

  const filterContent = (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search in previews..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
          className="pl-8 h-8"
        />
        {filters.searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => setFilters({ searchQuery: "" })}
          >
            <XIcon className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Project filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Project:
        </span>
        <Select
          value={filters.projectId ?? "all"}
          onValueChange={(value) =>
            setFilters({ projectId: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map(({ projectId, count }) => (
              <SelectItem key={projectId} value={projectId}>
                <span className="flex items-center gap-2">
                  <span className="truncate max-w-[150px]">
                    {extractProjectName(projectId)}
                  </span>
                  <span className="text-muted-foreground">({count})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entry type filters */}
      <div className="flex flex-wrap gap-1.5">
        {ENTRY_TYPES.map(({ value, label, icon, color }) => {
          const isActive = filters.entryTypes.includes(value);
          return (
            <Button
              key={value}
              variant="outline"
              size="sm"
              onClick={() => toggleEntryType(value)}
              className={cn(
                "h-7 px-2 gap-1.5 text-xs border transition-colors",
                isActive && color,
                !isActive && "opacity-60 hover:opacity-100",
              )}
            >
              {icon}
              {label}
            </Button>
          );
        })}
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-3 w-3 mr-1" />
          Clear all filters
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-between h-9 gap-2",
              hasActiveFilters && "border-primary",
            )}
          >
            <span className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {(filters.projectId ? 1 : 0) +
                    filters.entryTypes.length +
                    (filters.searchQuery ? 1 : 0)}
                </span>
              )}
            </span>
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180",
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          {filterContent}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-border">{filterContent}</div>
  );
};
