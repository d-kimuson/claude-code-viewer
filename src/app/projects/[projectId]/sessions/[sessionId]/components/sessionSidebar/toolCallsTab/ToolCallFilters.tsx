import { Trans } from "@lingui/react";
import { useNavigate } from "@tanstack/react-router";
import { FilterIcon, XIcon } from "lucide-react";
import { type FC, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Tab } from "../schema";
import { PathSearchInput } from "./PathSearchInput";
import { ToolTypeMultiSelect } from "./ToolTypeMultiSelect";

type ToolCallFiltersProps = {
  projectId: string;
  sessionId: string | undefined;
  currentTab: Tab;
  toolTypes: string | undefined;
  pathQuery: string | undefined;
};

export const ToolCallFilters: FC<ToolCallFiltersProps> = ({
  projectId,
  sessionId,
  currentTab,
  toolTypes,
  pathQuery,
}) => {
  const navigate = useNavigate();

  const selectedTypes = useMemo(() => {
    if (!toolTypes) return new Set<string>();
    return new Set(toolTypes.split(",").filter(Boolean));
  }, [toolTypes]);

  const handleToolTypesChange = useCallback(
    (newTypes: Set<string>) => {
      const typesParam =
        newTypes.size > 0 ? Array.from(newTypes).join(",") : undefined;
      navigate({
        to: "/projects/$projectId/session",
        params: { projectId },
        search: {
          sessionId,
          tab: currentTab,
          toolTypes: typesParam,
          pathQuery,
        },
      });
    },
    [navigate, projectId, sessionId, currentTab, pathQuery],
  );

  const handlePathQueryChange = useCallback(
    (newPathQuery: string) => {
      const queryParam = newPathQuery.trim() !== "" ? newPathQuery : undefined;
      navigate({
        to: "/projects/$projectId/session",
        params: { projectId },
        search: {
          sessionId,
          tab: currentTab,
          toolTypes,
          pathQuery: queryParam,
        },
      });
    },
    [navigate, projectId, sessionId, currentTab, toolTypes],
  );

  const handleClearFilters = useCallback(() => {
    navigate({
      to: "/projects/$projectId/session",
      params: { projectId },
      search: {
        sessionId,
        tab: currentTab,
      },
    });
  }, [navigate, projectId, sessionId, currentTab]);

  const hasActiveFilters =
    selectedTypes.size > 0 || (pathQuery?.trim() ?? "") !== "";

  return (
    <div className="border-b border-sidebar-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 text-sidebar-foreground/70" />
          <h3 className="text-sm font-semibold text-sidebar-foreground">
            <Trans id="tool.calls.filters.title" />
          </h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-7 px-2 text-xs"
          >
            <XIcon className="w-3 h-3 mr-1" />
            <Trans id="tool.calls.filters.clear" />
          </Button>
        )}
      </div>

      <PathSearchInput
        value={pathQuery ?? ""}
        onChange={handlePathQueryChange}
      />

      <Collapsible>
        <CollapsibleTrigger className="flex items-center text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
          <Trans id="tool.calls.filters.tool.types" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <ToolTypeMultiSelect
            selectedTypes={selectedTypes}
            onSelectionChange={handleToolTypesChange}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
