import {
  format,
  isThisWeek,
  isThisYear,
  isToday,
  isYesterday,
  startOfDay,
} from "date-fns";
import type { ActivityEntrySSE } from "../../types/sse";

export type TimeGroup = {
  key: string;
  label: string;
  entries: ActivityEntrySSE[];
};

export function getTimeGroupLabel(date: Date): string {
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  if (isThisWeek(date)) {
    return format(date, "EEEE"); // e.g., "Monday"
  }
  if (isThisYear(date)) {
    return format(date, "MMMM d"); // e.g., "January 15"
  }
  return format(date, "MMMM d, yyyy"); // e.g., "January 15, 2024"
}

export function getTimeGroupKey(date: Date): string {
  return format(startOfDay(date), "yyyy-MM-dd");
}

export function groupEntriesByTime(entries: ActivityEntrySSE[]): TimeGroup[] {
  const groups = new Map<string, TimeGroup>();

  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const key = getTimeGroupKey(date);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: getTimeGroupLabel(date),
        entries: [],
      });
    }

    const group = groups.get(key);
    if (group) {
      group.entries.push(entry);
    }
  }

  // Sort groups by date (newest first)
  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.key).getTime() - new Date(a.key).getTime(),
  );
}

// Group consecutive tool entries
export type GroupedEntry =
  | { type: "single"; entry: ActivityEntrySSE }
  | { type: "tool-group"; entries: ActivityEntrySSE[]; collapsed: boolean };

export function groupConsecutiveToolCalls(
  entries: ActivityEntrySSE[],
): GroupedEntry[] {
  const result: GroupedEntry[] = [];
  let currentToolGroup: ActivityEntrySSE[] = [];

  const flushToolGroup = () => {
    const firstEntry = currentToolGroup[0];
    if (!firstEntry) return;

    if (currentToolGroup.length === 1) {
      result.push({ type: "single", entry: firstEntry });
    } else {
      result.push({
        type: "tool-group",
        entries: currentToolGroup,
        collapsed: true,
      });
    }
    currentToolGroup = [];
  };

  for (const entry of entries) {
    if (entry.entryType === "tool") {
      currentToolGroup.push(entry);
    } else {
      flushToolGroup();
      result.push({ type: "single", entry });
    }
  }

  flushToolGroup();
  return result;
}
