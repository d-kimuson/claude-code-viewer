// Activity Feed Components
export { ActivityEntryItem, ToolGroup } from "./ActivityEntry";
export { ActivityEntryContext } from "./ActivityEntryContext";
export { ActivityFeed } from "./ActivityFeed";
// Filter Atoms
export {
  type ActivityFilters,
  activityFilterStorageAtom,
  activityFiltersAtom,
  activitySearchQueryAtom,
  type EntryTypeFilter,
  filterEntries,
  getUniqueProjects,
} from "./activityFilterAtoms";

// Smart Rendering Components
export { CodeBlock, InlineCode } from "./CodeBlock";
export {
  EntityText,
  extractEntities,
  extractFileName,
  FilePathBadge,
  GitCommitBadge,
  InlineCodeBadge,
  isFilePath,
  isGitCommit,
  UrlLink,
} from "./EntityRenderer";
export { FilterPanel } from "./FilterPanel";
export {
  formatPreviewForDisplay,
  isToolPreview,
  ToolBadge,
  ToolResultDisplay,
} from "./ToolResultDisplay";

// Time Grouping
export { getTimeGroupLabel, groupEntriesByTime } from "./timeGrouping";
// Tool Result Parsing
export {
  hasErrorPatterns,
  isStackTraceContent,
  type ParsedToolResult,
  parseToolPreview,
  parseToolResult,
  parseToolUse,
  prettifyMcpToolName,
} from "./toolResultParser";
