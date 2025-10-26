import { Trans } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Folder } from "lucide-react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { directoryListingQuery } from "@/lib/api/queries";

export type DirectoryPickerProps = {
  selectedPath: string;
  onPathChange: (path: string) => void;
};

export const DirectoryPicker: FC<DirectoryPickerProps> = ({ onPathChange }) => {
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery(directoryListingQuery(currentPath));

  const handleNavigate = (entryPath: string) => {
    if (entryPath === "") {
      setCurrentPath(undefined);
      return;
    }

    const newPath = `/${entryPath}`;
    setCurrentPath(newPath);
  };

  const handleSelect = () => {
    onPathChange(data?.currentPath || "");
  };

  return (
    <div className="border rounded-md">
      <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
        <p className="text-sm font-medium">
          <Trans id="directory_picker.current" message="Current:" />{" "}
          <span className="font-mono">{data?.currentPath || "~"}</span>
        </p>
        <Button size="sm" onClick={handleSelect}>
          <Trans id="directory_picker.select" message="Select This Directory" />
        </Button>
      </div>
      <div className="max-h-96 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Trans id="directory_picker.loading" message="Loading..." />
          </div>
        ) : data?.entries && data.entries.length > 0 ? (
          <div className="divide-y">
            {data.entries
              .filter((entry) => entry.type === "directory")
              .map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => handleNavigate(entry.path)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
                >
                  {entry.name === ".." ? (
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  ) : (
                    <Folder className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="text-sm">{entry.name}</span>
                </button>
              ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Trans
              id="directory_picker.no_directories"
              message="No directories found"
            />
          </div>
        )}
      </div>
    </div>
  );
};
