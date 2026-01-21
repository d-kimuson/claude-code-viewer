import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ActivityEntrySSE } from "../../types/sse";

export type EntryTypeFilter = ActivityEntrySSE["entryType"];

export interface ActivityFilters {
  projectId: string | null;
  entryTypes: EntryTypeFilter[];
  searchQuery: string;
}

// Persisted filter preferences (excluding search which is session-only)
export const activityFilterStorageAtom = atomWithStorage<
  Omit<ActivityFilters, "searchQuery">
>("activity-filters", {
  projectId: null,
  entryTypes: [],
});

// Session-only search query
export const activitySearchQueryAtom = atom("");

// Combined filters atom
export const activityFiltersAtom = atom(
  (get) => {
    const storage = get(activityFilterStorageAtom);
    const searchQuery = get(activitySearchQueryAtom);
    return {
      ...storage,
      searchQuery,
    };
  },
  (get, set, update: Partial<ActivityFilters>) => {
    if ("searchQuery" in update) {
      set(activitySearchQueryAtom, update.searchQuery ?? "");
    }
    if ("projectId" in update || "entryTypes" in update) {
      const current = get(activityFilterStorageAtom);
      set(activityFilterStorageAtom, {
        ...current,
        ...(update.projectId !== undefined
          ? { projectId: update.projectId }
          : {}),
        ...(update.entryTypes !== undefined
          ? { entryTypes: update.entryTypes }
          : {}),
      });
    }
  },
);

// Filter logic
export function filterEntries(
  entries: ActivityEntrySSE[],
  filters: ActivityFilters,
): ActivityEntrySSE[] {
  return entries.filter((entry) => {
    // Project filter
    if (filters.projectId !== null && entry.projectId !== filters.projectId) {
      return false;
    }

    // Entry type filter (empty means all types)
    if (
      filters.entryTypes.length > 0 &&
      !filters.entryTypes.includes(entry.entryType)
    ) {
      return false;
    }

    // Search filter (case-insensitive substring match)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const previewMatch = entry.preview.toLowerCase().includes(query);
      if (!previewMatch) {
        return false;
      }
    }

    return true;
  });
}

// Get unique projects from entries
export function getUniqueProjects(
  entries: ActivityEntrySSE[],
): Array<{ projectId: string; count: number }> {
  const projectCounts = new Map<string, number>();

  for (const entry of entries) {
    const count = projectCounts.get(entry.projectId) ?? 0;
    projectCounts.set(entry.projectId, count + 1);
  }

  return Array.from(projectCounts.entries())
    .map(([projectId, count]) => ({ projectId, count }))
    .sort((a, b) => b.count - a.count);
}
