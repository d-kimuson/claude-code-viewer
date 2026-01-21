import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardIcon,
} from "lucide-react";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  fileName?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  maxLines?: number;
  className?: string;
}

// Language detection from file extension or content
function detectLanguage(code: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      py: "python",
      rb: "ruby",
      go: "go",
      rs: "rust",
      java: "java",
      kt: "kotlin",
      swift: "swift",
      c: "c",
      cpp: "cpp",
      h: "c",
      hpp: "cpp",
      cs: "csharp",
      php: "php",
      sh: "bash",
      bash: "bash",
      zsh: "bash",
      fish: "fish",
      ps1: "powershell",
      sql: "sql",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      toml: "toml",
      xml: "xml",
      html: "html",
      css: "css",
      scss: "scss",
      less: "less",
      md: "markdown",
      mdx: "mdx",
      graphql: "graphql",
      gql: "graphql",
      dockerfile: "dockerfile",
      makefile: "makefile",
      cmake: "cmake",
    };
    if (ext && langMap[ext]) {
      return langMap[ext];
    }
  }

  // Content-based detection
  if (code.match(/^(import|export|const|let|var|function|class)\s/m)) {
    if (code.includes("React") || code.match(/<[A-Z][a-zA-Z]*\s/)) {
      return "tsx";
    }
    return "typescript";
  }
  if (code.match(/^(def|class|import|from|if __name__)/m)) {
    return "python";
  }
  if (code.match(/^(package|func|import|type|struct)\s/m)) {
    return "go";
  }
  if (code.match(/^(fn|let|mut|use|mod|pub|impl)\s/m)) {
    return "rust";
  }
  if (code.match(/^\$\s/m) || code.match(/^(if|then|fi|do|done|echo)\s/m)) {
    return "bash";
  }

  return "text";
}

// Shiki highlighter singleton
type ShikiHighlighter = {
  codeToHtml: (
    code: string,
    options: { lang: string; theme: string },
  ) => string;
};

let highlighterPromise: Promise<ShikiHighlighter> | null = null;

async function getHighlighter(): Promise<ShikiHighlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const shiki = await import("shiki");
      return shiki.createHighlighter({
        themes: ["github-dark", "github-light"],
        langs: [
          "typescript",
          "tsx",
          "javascript",
          "jsx",
          "python",
          "go",
          "rust",
          "bash",
          "json",
          "yaml",
          "html",
          "css",
          "markdown",
          "sql",
          "graphql",
          "dockerfile",
          "makefile",
        ],
      });
    })();
  }
  return highlighterPromise;
}

interface HighlightResult {
  html: string;
  language: string;
}

function useHighlightedCode(
  code: string,
  language?: string,
  fileName?: string,
): HighlightResult | null {
  const [result, setResult] = useState<HighlightResult | null>(null);

  const detectedLanguage = useMemo(
    () => language ?? detectLanguage(code, fileName),
    [code, language, fileName],
  );

  useEffect(() => {
    let cancelled = false;

    getHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        try {
          const html = highlighter.codeToHtml(code, {
            lang: detectedLanguage,
            theme: "github-dark",
          });
          setResult({ html, language: detectedLanguage });
        } catch {
          // Language not supported, fallback to plain text
          const escaped = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          setResult({
            html: `<pre class="shiki"><code>${escaped}</code></pre>`,
            language: "text",
          });
        }
      })
      .catch(() => {
        // Shiki failed to load, use plain text
        const escaped = code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        setResult({
          html: `<pre class="shiki"><code>${escaped}</code></pre>`,
          language: "text",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [code, detectedLanguage]);

  return result;
}

export const CodeBlock: FC<CodeBlockProps> = ({
  code,
  language,
  fileName,
  collapsible = true,
  defaultCollapsed,
  maxLines = 10,
  className,
}) => {
  const lineCount = code.split("\n").length;
  const shouldCollapse = collapsible && lineCount > maxLines;
  const [isCollapsed, setIsCollapsed] = useState(
    defaultCollapsed ?? shouldCollapse,
  );
  const [copied, setCopied] = useState(false);

  const highlighted = useHighlightedCode(code, language, fileName);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [code]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Display code (collapsed or full)
  const displayCode = useMemo(() => {
    if (!isCollapsed) return code;
    const lines = code.split("\n");
    return lines.slice(0, maxLines).join("\n");
  }, [code, isCollapsed, maxLines]);

  const displayHighlighted = useHighlightedCode(
    displayCode,
    language,
    fileName,
  );

  return (
    <div
      className={cn(
        "relative rounded-md border border-border overflow-hidden bg-[#0d1117]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          {shouldCollapse && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          )}
          {fileName && (
            <span className="text-xs font-mono text-muted-foreground">
              {fileName}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/60 uppercase">
            {highlighted?.language ?? language ?? "text"}
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {lineCount} lines
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <ClipboardIcon className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        {displayHighlighted ? (
          <div
            className="text-sm [&_pre]:!bg-transparent [&_pre]:p-3 [&_pre]:m-0 [&_code]:text-xs [&_code]:leading-relaxed"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is safe
            dangerouslySetInnerHTML={{ __html: displayHighlighted.html }}
          />
        ) : (
          <pre className="p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap">
            <code>{displayCode}</code>
          </pre>
        )}
      </div>

      {/* Collapse indicator */}
      {isCollapsed && shouldCollapse && (
        <button
          type="button"
          onClick={toggleCollapse}
          className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground bg-gradient-to-t from-[#0d1117] to-transparent flex items-center justify-center gap-1 transition-colors"
        >
          <ChevronDownIcon className="h-3 w-3" />
          Show {lineCount - maxLines} more lines
        </button>
      )}
    </div>
  );
};

// Inline code component for small code snippets
interface InlineCodeProps {
  children: string;
  className?: string;
}

export const InlineCode: FC<InlineCodeProps> = ({ children, className }) => {
  return (
    <code
      className={cn(
        "px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-foreground/90",
        className,
      )}
    >
      {children}
    </code>
  );
};
