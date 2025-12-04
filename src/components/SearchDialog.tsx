import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2Icon, MessageSquareIcon, SearchIcon } from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { searchQuery } from "../lib/api/queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
};

export function SearchDialog({
  open,
  onOpenChange,
  projectId,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    ...searchQuery(debouncedQuery, { projectId }),
    enabled: debouncedQuery.length >= 2,
  });

  const results = data?.results ?? [];

  // Reset selection when query changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-run on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (result: (typeof results)[number]) => {
      onOpenChange(false);
      navigate({
        to: "/projects/$projectId/session",
        params: { projectId: result.projectId },
        search: { sessionId: result.sessionId },
      });
    },
    [navigate, onOpenChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
      }
    },
    [results, selectedIndex, handleSelect],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search conversations</DialogTitle>
        </DialogHeader>

        <div className="flex items-center border-b px-3">
          <SearchIcon className="size-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            placeholder={
              projectId ? "Search this project..." : "Search all projects..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
          />
          {isLoading && (
            <Loader2Icon className="size-4 shrink-0 opacity-50 animate-spin" />
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {debouncedQuery.length < 2 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="p-2">
              {results.map((result, index) => (
                <button
                  key={`${result.sessionId}-${result.conversationIndex}`}
                  type="button"
                  className={`w-full text-left p-3 rounded-md cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquareIcon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {result.projectName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {result.type === "user" ? "You" : "Claude"}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 break-words">
                        {result.snippet}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(result.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
              ↵
            </kbd>{" "}
            select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
