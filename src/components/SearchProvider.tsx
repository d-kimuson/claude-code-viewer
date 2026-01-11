import { useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";
import { useConfig } from "@/app/hooks/useConfig";
import { SearchDialog } from "./SearchDialog";

type SearchContextValue = {
  openSearch: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}

type SearchProviderProps = {
  children: React.ReactNode;
};

function getProjectIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1];
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const routerState = useRouterState();
  const projectId = getProjectIdFromPath(routerState.location.pathname);
  const { config } = useConfig();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const searchHotkey = config?.searchHotkey || "command-k";
      const shouldOpenSearch =
        searchHotkey === "command-k"
          ? e.metaKey && !e.ctrlKey && e.key === "k"
          : !e.metaKey && e.ctrlKey && e.key === "k";

      if (shouldOpenSearch) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [config?.searchHotkey]);

  const openSearch = () => setIsOpen(true);

  return (
    <SearchContext.Provider value={{ openSearch }}>
      {children}
      <SearchDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        projectId={projectId}
      />
    </SearchContext.Provider>
  );
}
