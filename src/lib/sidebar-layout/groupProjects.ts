export type TreeProject = {
  id: string;
  projectPath: string | null;
  claudeProjectPath: string;
  lastModifiedAt: string | Date;
  sessionCount: number;
};
export type ProjectGroup = {
  groupKey: string;
  name: string;
  lastModifiedAt: number;
  members: { project: TreeProject; worktreeName: string | null }[];
};
export const groupProjects = (projects: TreeProject[]): ProjectGroup[] => {
  const groups = new Map<string, ProjectGroup>();
  for (const project of projects) {
    const path = project.projectPath;
    const worktree = path?.match(/^(.*)[/\\]\.claude[/\\]worktrees[/\\]([^/\\]+)$/);
    const scratch =
      path !== null &&
      /(?:Application Support|AppData[/\\]Roaming)[/\\]Claude[/\\]scratch-workspaces/.test(path);
    const groupKey =
      worktree?.[1] ??
      (scratch
        ? "__no_project__"
        : path === null || path === ""
          ? `__unknown__:${project.id}`
          : path);
    const name =
      path === null || path === ""
        ? project.claudeProjectPath
        : (groupKey
            .split(/[/\\]/)
            .reverse()
            .find((part) => part !== "") ?? groupKey);
    const group = groups.get(groupKey) ?? { groupKey, name, lastModifiedAt: 0, members: [] };
    group.lastModifiedAt = Math.max(
      group.lastModifiedAt,
      new Date(project.lastModifiedAt).getTime(),
    );
    group.members.push({ project, worktreeName: worktree?.[2] ?? null });
    groups.set(groupKey, group);
  }
  return [...groups.values()];
};
