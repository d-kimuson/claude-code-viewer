import { Trans } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CheckIcon, ChevronsUpDownIcon, FolderIcon } from "lucide-react";
import { type FC, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/web/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/web/components/ui/popover";
import { projectListQuery } from "@/web/lib/api/queries";
import { cn } from "@/web/utils";

/** Replace /home/<user> or /Users/<user> prefix with ~/ */
const shortenHome = (path: string): string => path.replace(/^\/(?:home|Users)\/[^/]+/, "~");

type ProjectSwitcherProps = {
  currentProjectId?: string;
  currentProjectPath?: string;
};

export const ProjectSwitcher: FC<ProjectSwitcherProps> = ({
  currentProjectId,
  currentProjectPath,
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: projectListQuery.queryKey,
    queryFn: projectListQuery.queryFn,
  });

  const projects = data?.projects ?? [];

  // Derive display path from own query data if not provided as prop
  const resolvedPath =
    currentProjectPath ??
    (() => {
      const match = projects.find((p) => p.id === currentProjectId);
      return match ? (match.meta.projectPath ?? match.claudeProjectPath) : undefined;
    })();
  const displayPath =
    resolvedPath !== undefined && resolvedPath !== "" ? shortenHome(resolvedPath) : undefined;

  const handleSelect = (projectId: string) => {
    setOpen(false);
    if (projectId === currentProjectId) return;
    void navigate({
      to: "/projects/$projectId/session",
      params: { projectId },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props -- shadcn-ui Combobox pattern
          role="combobox"
          aria-expanded={open}
          className="flex items-center gap-1.5 h-7 text-foreground/70 font-medium truncate hover:text-foreground transition-colors rounded px-2 hover:bg-muted/50"
        >
          <FolderIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
          <span className="truncate max-w-[300px] font-mono text-xs">
            {displayPath ?? <Trans id="project_switcher.no_project" />}
          </span>
          <ChevronsUpDownIcon className="w-3.5 h-3.5 shrink-0 opacity-40" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[53]" align="start" sideOffset={8}>
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandEmpty>
              <Trans id="project_switcher.no_results" />
            </CommandEmpty>
            <CommandGroup>
              {projects.map((project) => {
                const path = project.meta.projectPath ?? project.claudeProjectPath;
                const displayPath = shortenHome(path);
                const isActive = project.id === currentProjectId;
                return (
                  <CommandItem
                    key={project.id}
                    value={path}
                    onSelect={() => handleSelect(project.id)}
                    className="gap-2"
                  >
                    <CheckIcon
                      className={cn("w-3.5 h-3.5 shrink-0", isActive ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate font-mono text-xs">{displayPath}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
