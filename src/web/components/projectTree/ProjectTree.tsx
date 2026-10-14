import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trans, useLingui } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon, GripVerticalIcon, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { applyLayout, reorderLayout } from "@/lib/sidebar-layout/applyLayout";
import { groupProjects, type ProjectGroup } from "@/lib/sidebar-layout/groupProjects";
import type { SidebarLayout } from "@/lib/sidebar-layout/schema";
import { Button } from "@/web/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/web/components/ui/popover";
import { useSidebarLayout } from "@/web/hooks/useSidebarLayout";
import { projectListQuery } from "@/web/lib/api/queries";
import { GroupSessions } from "./GroupSessions";

export type ProjectTreeProps = {
  currentProjectId?: string;
  currentSessionId?: string;
  onSessionSelect?: () => void;
};
type RowProps = ProjectTreeProps & {
  group: ProjectGroup;
  layout: SidebarLayout;
  hidden: boolean;
  disabled: boolean;
  update: (layout: SidebarLayout, options?: { onError: () => void }) => void;
};
export const ProjectGroupRow = ({
  group,
  layout,
  hidden,
  disabled,
  update,
  ...selection
}: RowProps) => {
  const { i18n } = useLingui();
  const sortable = useSortable({ id: group.groupKey, disabled: hidden || disabled });
  const [closedSession, setClosedSession] = useState<string>();
  const active = group.members.some((member) => member.project.id === selection.currentProjectId);
  const collapsed =
    !layout.expanded.includes(group.groupKey) &&
    (!active || closedSession === selection.currentSessionId);
  const name =
    group.groupKey === "__no_project__"
      ? i18n._({ id: "tree.no_project", message: "No project sessions" })
      : group.name;
  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-1 rounded hover:bg-sidebar-accent min-w-0">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm"
          title={group.groupKey}
          aria-expanded={!collapsed}
          disabled={disabled}
          onClick={() => {
            setClosedSession(collapsed ? undefined : selection.currentSessionId);
            update(
              {
                ...layout,
                expanded: collapsed
                  ? [...layout.expanded.filter((key) => key !== group.groupKey), group.groupKey]
                  : layout.expanded.filter((key) => key !== group.groupKey),
              },
              { onError: () => setClosedSession(closedSession) },
            );
          }}
        >
          <ChevronRightIcon className={`size-4 shrink-0 ${collapsed ? "" : "rotate-90"}`} />
          <span className="truncate flex-1 font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">
            {group.members.reduce((total, member) => total + member.project.sessionCount, 0)}
          </span>
        </button>
        {!hidden && (
          <button
            type="button"
            ref={sortable.setActivatorNodeRef}
            {...sortable.attributes}
            {...sortable.listeners}
            disabled={disabled}
            className="p-1 shrink-0 cursor-grab touch-manipulation"
            aria-label={i18n._({ id: "tree.reorder", message: "Reorder project" })}
          >
            <GripVerticalIcon className="size-4 text-muted-foreground" />
          </button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={i18n._({ id: "tree.actions", message: "Project actions" })}
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1" align="end">
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() =>
                update({
                  ...layout,
                  hidden: hidden
                    ? layout.hidden.filter((key) => key !== group.groupKey)
                    : [...layout.hidden, group.groupKey],
                })
              }
            >
              {hidden ? (
                <Trans id="tree.unhide" message="Unhide" />
              ) : (
                <Trans id="tree.hide" message="Hide" />
              )}
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      {!collapsed && !hidden && <GroupSessions group={group} {...selection} />}
    </div>
  );
};
export const ProjectTree = (selection: ProjectTreeProps) => {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const projects = useQuery(projectListQuery);
  const layout = useSidebarLayout();
  const error = layout.error ?? projects.error;
  if (error !== null)
    return (
      <p role="alert" className="p-4 text-sm text-destructive">
        {error.message}
      </p>
    );
  if (layout.data === undefined || projects.data === undefined)
    return (
      <div className="p-4">
        <Trans id="common.loading" />
      </div>
    );
  const groups = groupProjects(
    projects.data.projects.map((project) => ({
      ...project,
      projectPath: project.meta.projectPath,
      sessionCount: project.meta.sessionCount,
    })),
  );
  // Directories holding only memory files have no sessions and no resolvable path.
  const withSessions = groups.filter((group) =>
    group.members.some((member) => member.project.sessionCount > 0),
  );
  const { visible, hidden } = applyLayout(withSessions, layout.data);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over === null || active.id === over.id || layout.isSaving || layout.data === undefined)
          return;
        const keys = visible.map((group) => group.groupKey);
        const from = keys.indexOf(String(active.id));
        const to = keys.indexOf(String(over.id));
        if (from < 0 || to < 0) return;
        layout.updateLayout(reorderLayout(layout.data, arrayMove(keys, from, to)));
      }}
    >
      <SortableContext
        items={visible.map((group) => group.groupKey)}
        strategy={verticalListSortingStrategy}
      >
        <div className="h-full overflow-y-auto p-2">
          {visible.map((group) => (
            <ProjectGroupRow
              key={group.groupKey}
              group={group}
              layout={layout.data}
              hidden={false}
              disabled={layout.isSaving}
              update={layout.updateLayout}
              {...selection}
            />
          ))}
          {hidden.length > 0 && (
            <details className="mt-3 border-t border-sidebar-border pt-2">
              <summary className="cursor-pointer p-2 text-sm text-muted-foreground">
                <Trans id="tree.hidden" message="Hidden" /> ({hidden.length})
              </summary>
              {hidden.map((group) => (
                <ProjectGroupRow
                  key={group.groupKey}
                  group={group}
                  layout={layout.data}
                  hidden
                  disabled={layout.isSaving}
                  update={layout.updateLayout}
                  {...selection}
                />
              ))}
            </details>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
};
