import type { ProjectGroup } from "./groupProjects";
import type { SidebarLayout } from "./schema";
export const applyLayout = (groups: ProjectGroup[], layout: SidebarLayout) => {
  const byKey = new Map(groups.map((group) => [group.groupKey, group]));
  const ordered = [
    ...groups
      .filter((group) => !layout.order.includes(group.groupKey))
      .sort((a, b) => b.lastModifiedAt - a.lastModifiedAt),
    ...[...new Set(layout.order)].flatMap((key) => {
      const group = byKey.get(key);
      return group ? [group] : [];
    }),
  ];
  return {
    visible: ordered.filter((group) => !layout.hidden.includes(group.groupKey)),
    hidden: ordered.filter((group) => layout.hidden.includes(group.groupKey)),
  };
};
export const reorderLayout = (layout: SidebarLayout, visibleKeys: string[]): SidebarLayout => {
  const remaining = [...visibleKeys];
  const order = layout.order.flatMap((key) =>
    layout.hidden.includes(key) ? [key] : remaining.splice(0, 1),
  );
  return { ...layout, order: [...order, ...remaining] };
};
