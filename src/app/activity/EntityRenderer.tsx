import { ExternalLinkIcon, FileIcon, GitCommitIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cn } from "../../lib/utils";

// Entity types that can be extracted and rendered
export type EntityType = "file-path" | "git-commit" | "url" | "code";

export interface Entity {
  type: EntityType;
  value: string;
  start: number;
  end: number;
}

// Regex patterns for entity extraction
const PATTERNS = {
  // File paths (Unix and Windows)
  filePath:
    /(?:^|[\s(["'])((\/[\w.-]+)+(?:\.[a-zA-Z0-9]+)?|([a-zA-Z]:\\[\w\\.-]+)|(\.\/([\w.-]+\/)*[\w.-]+))/g,
  // Git commit hashes (7+ hex chars)
  gitCommit: /\b([a-f0-9]{7,40})\b/gi,
  // URLs
  url: /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
  // Inline code (backticks)
  inlineCode: /`([^`]+)`/g,
};

/**
 * Extract entities from text content
 */
export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];

  // Extract file paths
  const fileMatches = text.matchAll(PATTERNS.filePath);
  for (const match of fileMatches) {
    if (match[1] && match.index !== undefined) {
      // Filter out false positives (numbers, short strings)
      const path = match[1];
      if (path.length > 3 && path.includes("/")) {
        entities.push({
          type: "file-path",
          value: path,
          start: match.index + (match[0].length - match[1].length),
          end: match.index + match[0].length,
        });
      }
    }
  }

  // Extract URLs
  const urlMatches = text.matchAll(PATTERNS.url);
  for (const match of urlMatches) {
    if (match[0] && match.index !== undefined) {
      entities.push({
        type: "url",
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Extract git commits (only if they look like commits, not random hex)
  const commitMatches = text.matchAll(PATTERNS.gitCommit);
  for (const match of commitMatches) {
    if (match[1] && match.index !== undefined) {
      // Check surrounding context for git-related keywords
      const context = text.slice(
        Math.max(0, match.index - 50),
        match.index + 50,
      );
      const isLikelyCommit =
        /commit|hash|sha|ref|merge|revert|cherry-pick/i.test(context) ||
        match[1].length === 40 || // Full SHA
        match[1].length === 7; // Short SHA

      if (isLikelyCommit) {
        entities.push({
          type: "git-commit",
          value: match[1],
          start: match.index,
          end: match.index + match[1].length,
        });
      }
    }
  }

  // Extract inline code
  const codeMatches = text.matchAll(PATTERNS.inlineCode);
  for (const match of codeMatches) {
    if (match[1] && match.index !== undefined) {
      entities.push({
        type: "code",
        value: match[1],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Sort by start position and remove overlaps
  entities.sort((a, b) => a.start - b.start);

  const filtered: Entity[] = [];
  let lastEnd = 0;
  for (const entity of entities) {
    if (entity.start >= lastEnd) {
      filtered.push(entity);
      lastEnd = entity.end;
    }
  }

  return filtered;
}

// Component props
interface FilePathBadgeProps {
  path: string;
  className?: string;
}

export const FilePathBadge: FC<FilePathBadgeProps> = ({ path, className }) => {
  const fileName = path.split("/").pop() ?? path;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 font-mono text-xs text-foreground/80",
        className,
      )}
      title={path}
    >
      <FileIcon className="h-3 w-3 text-muted-foreground" />
      {fileName}
    </span>
  );
};

interface GitCommitBadgeProps {
  hash: string;
  className?: string;
}

export const GitCommitBadge: FC<GitCommitBadgeProps> = ({
  hash,
  className,
}) => {
  const shortHash = hash.slice(0, 7);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 font-mono text-xs text-amber-600 dark:text-amber-400",
        className,
      )}
      title={hash}
    >
      <GitCommitIcon className="h-3 w-3" />
      {shortHash}
    </span>
  );
};

interface UrlLinkProps {
  url: string;
  className?: string;
}

export const UrlLink: FC<UrlLinkProps> = ({ url, className }) => {
  // Extract domain for display
  let displayUrl = url;
  try {
    const urlObj = new URL(url);
    displayUrl =
      urlObj.hostname + (urlObj.pathname !== "/" ? urlObj.pathname : "");
    if (displayUrl.length > 40) {
      displayUrl = `${displayUrl.slice(0, 40)}...`;
    }
  } catch {
    displayUrl = url.slice(0, 40);
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline",
        className,
      )}
    >
      {displayUrl}
      <ExternalLinkIcon className="h-3 w-3" />
    </a>
  );
};

interface InlineCodeBadgeProps {
  code: string;
  className?: string;
}

export const InlineCodeBadge: FC<InlineCodeBadgeProps> = ({
  code,
  className,
}) => {
  return (
    <code
      className={cn(
        "px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-foreground/90",
        className,
      )}
    >
      {code}
    </code>
  );
};

/**
 * Render text with entities highlighted
 */
interface EntityTextProps {
  text: string;
  className?: string;
}

export const EntityText: FC<EntityTextProps> = ({ text, className }) => {
  const entities = extractEntities(text);

  if (entities.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (!entity) continue;

    // Add text before entity
    if (entity.start > lastIndex) {
      parts.push(
        <span key={`text-${i}`}>{text.slice(lastIndex, entity.start)}</span>,
      );
    }

    // Add entity component
    switch (entity.type) {
      case "file-path":
        parts.push(<FilePathBadge key={`entity-${i}`} path={entity.value} />);
        break;
      case "git-commit":
        parts.push(<GitCommitBadge key={`entity-${i}`} hash={entity.value} />);
        break;
      case "url":
        parts.push(<UrlLink key={`entity-${i}`} url={entity.value} />);
        break;
      case "code":
        parts.push(<InlineCodeBadge key={`entity-${i}`} code={entity.value} />);
        break;
    }

    lastIndex = entity.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return <span className={cn("break-words", className)}>{parts}</span>;
};

/**
 * Extract just the file name from a path
 */
export function extractFileName(path: string): string {
  return path.split("/").pop() ?? path;
}

/**
 * Check if a string looks like a file path
 */
export function isFilePath(str: string): boolean {
  return /^(\/|\.\/|[a-zA-Z]:\\)/.test(str) || str.includes("/");
}

/**
 * Check if a string looks like a git commit hash
 */
export function isGitCommit(str: string): boolean {
  return /^[a-f0-9]{7,40}$/i.test(str);
}
