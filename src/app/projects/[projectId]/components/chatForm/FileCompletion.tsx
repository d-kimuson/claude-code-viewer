import { CheckIcon, FileIcon, FolderIcon } from "lucide-react";
import type React from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "../../../../../components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "../../../../../components/ui/collapsible";
import {
  type FileCompletionEntry,
  useFileCompletion,
} from "../../../../../hooks/useFileCompletion";
import { cn } from "../../../../../lib/utils";

type FileCompletionProps = {
  projectId: string;
  inputValue: string;
  onFileSelect: (filePath: string) => void;
  className?: string;
};

export type FileCompletionRef = {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
};

// Parse the @ completion from input value
const parseFileCompletionFromInput = (input: string) => {
  // Find the last @ symbol
  const lastAtIndex = input.lastIndexOf("@");
  if (lastAtIndex === -1) {
    return { shouldShow: false, searchPath: "", beforeAt: "", afterAt: "" };
  }

  // Get the text before and after @
  const beforeAt = input.slice(0, lastAtIndex);
  const afterAt = input.slice(lastAtIndex + 1);

  // Check if we're in the middle of a word after @ (no space after the path)
  const parts = afterAt.split(/\s/);
  const searchPath = parts[0] || "";

  // Don't show completion if there's a space after the path (user has finished typing the path)
  // This includes cases like "@hoge " where parts = ["hoge", ""]
  const hasSpaceAfterPath = parts.length > 1;

  return {
    shouldShow: !hasSpaceAfterPath,
    searchPath,
    beforeAt,
    afterAt,
  };
};

export const FileCompletion = forwardRef<
  FileCompletionRef,
  FileCompletionProps
>(({ projectId, inputValue, onFileSelect, className }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Parse the input to extract the path being completed
  const { shouldShow, searchPath, beforeAt, afterAt } = useMemo(
    () => parseFileCompletionFromInput(inputValue),
    [inputValue],
  );

  // Determine the base path and filter term
  const { basePath, filterTerm } = useMemo(() => {
    if (!searchPath) {
      return { basePath: "/", filterTerm: "" };
    }

    const lastSlashIndex = searchPath.lastIndexOf("/");
    if (lastSlashIndex === -1) {
      return { basePath: "/", filterTerm: searchPath };
    }

    const path = searchPath.slice(0, lastSlashIndex + 1);
    const term = searchPath.slice(lastSlashIndex + 1);
    return {
      basePath: path === "/" ? "/" : path,
      filterTerm: term,
    };
  }, [searchPath]);

  // Fetch file completion data
  const { data: completionData, isLoading } = useFileCompletion(
    projectId,
    basePath,
    shouldShow,
  );

  // Filter entries based on the current filter term
  const filteredEntries = useMemo(() => {
    if (!completionData?.entries) return [];

    if (!filterTerm) {
      return completionData.entries;
    }

    return completionData.entries.filter((entry) =>
      entry.name.toLowerCase().includes(filterTerm.toLowerCase()),
    );
  }, [completionData?.entries, filterTerm]);

  // Determine if completion should be shown
  const shouldBeOpen = shouldShow && !isLoading && filteredEntries.length > 0;

  // Update open state when it should change
  if (isOpen !== shouldBeOpen) {
    setIsOpen(shouldBeOpen);
    setSelectedIndex(-1);
  }

  // Handle file/directory selection with different behaviors for different triggers
  const handleEntrySelect = useCallback(
    (entry: FileCompletionEntry, forceClose = false) => {
      const fullPath = entry.path;

      // For directories, add a trailing slash to continue completion (unless forced to close)
      // For files or when forced to close, add a space to end completion

      // Reconstruct the message with the selected path
      const remainingText = afterAt.split(/\s/).slice(1).join(" ");
      const newMessage =
        `${beforeAt}@${fullPath}${remainingText}`.trim() +
        (entry.type === "directory" && !forceClose ? "/" : " ");

      onFileSelect(newMessage);

      // Close completion if it's a file, or if forced to close
      if (entry.type === "file" || forceClose) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    },
    [beforeAt, afterAt, onFileSelect],
  );

  // Scroll to selected entry
  const scrollToSelected = useCallback((index: number) => {
    if (index >= 0 && listRef.current) {
      // ボタン要素を直接検索
      const buttons = listRef.current.querySelectorAll('button[role="option"]');
      const selectedButton = buttons[index] as HTMLElement;
      if (selectedButton) {
        selectedButton.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, []);

  // Keyboard navigation
  const handleKeyboardNavigation = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isOpen || filteredEntries.length === 0) return false;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = prev < filteredEntries.length - 1 ? prev + 1 : 0;
            requestAnimationFrame(() => scrollToSelected(newIndex));
            return newIndex;
          });
          return true;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = prev > 0 ? prev - 1 : filteredEntries.length - 1;
            requestAnimationFrame(() => scrollToSelected(newIndex));
            return newIndex;
          });
          return true;
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < filteredEntries.length) {
            e.preventDefault();
            const selectedEntry = filteredEntries[selectedIndex];
            if (selectedEntry) {
              // Enter always closes completion (even for directories)
              handleEntrySelect(selectedEntry, true);
            }
            return true;
          }
          break;
        case "Tab":
          if (selectedIndex >= 0 && selectedIndex < filteredEntries.length) {
            e.preventDefault();
            const selectedEntry = filteredEntries[selectedIndex];
            if (selectedEntry) {
              // Tab: continue completion for directories, close for files
              handleEntrySelect(selectedEntry, selectedEntry.type === "file");
            }
            return true;
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          return true;
      }
      return false;
    },
    [
      isOpen,
      filteredEntries.length,
      selectedIndex,
      handleEntrySelect,
      scrollToSelected,
      filteredEntries,
    ],
  );

  // Handle clicks outside the component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Expose keyboard handler to parent
  useImperativeHandle(
    ref,
    () => ({
      handleKeyDown: handleKeyboardNavigation,
    }),
    [handleKeyboardNavigation],
  );

  if (!shouldShow || isLoading || filteredEntries.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <div
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
            role="listbox"
            aria-label="Available files and directories"
          >
            {filteredEntries.length > 0 && (
              <div className="p-1">
                <div
                  className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border mb-1 flex items-center gap-2"
                  role="presentation"
                >
                  <FileIcon className="w-3 h-3" />
                  Files & Directories ({filteredEntries.length})
                  {basePath !== "/" && (
                    <span className="text-xs font-mono text-muted-foreground/70">
                      in {basePath}
                    </span>
                  )}
                </div>
                {filteredEntries.map((entry, index) => (
                  <Button
                    key={entry.path}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-mono text-sm h-8 px-2 min-w-0",
                      index === selectedIndex &&
                        "bg-accent text-accent-foreground",
                    )}
                    onClick={() =>
                      handleEntrySelect(entry, entry.type === "file")
                    }
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    aria-label={`${entry.type}: ${entry.name}`}
                    title={entry.path}
                  >
                    {entry.type === "directory" ? (
                      <FolderIcon className="w-3 h-3 mr-2 text-blue-500 flex-shrink-0" />
                    ) : (
                      <FileIcon className="w-3 h-3 mr-2 text-gray-500 flex-shrink-0" />
                    )}
                    <span className="font-medium truncate min-w-0">
                      {entry.name}
                    </span>
                    {entry.type === "directory" && (
                      <span className="text-muted-foreground ml-1 flex-shrink-0">
                        /
                      </span>
                    )}
                    {index === selectedIndex && (
                      <CheckIcon className="w-3 h-3 ml-auto text-primary flex-shrink-0" />
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

FileCompletion.displayName = "FileCompletion";
