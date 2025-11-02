import { Trans } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Folder } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { directoryListingQuery } from "@/lib/api/queries";

export type DirectoryPickerProps = {
  onPathChange: (path: string) => void;
};

export const DirectoryPicker: FC<DirectoryPickerProps> = ({ onPathChange }) => {
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined);
  const [showHidden, setShowHidden] = useState(false);

  const { data, isLoading } = useQuery(
    directoryListingQuery(currentPath, showHidden),
  );

  useEffect(() => {
    if (data?.currentPath) {
      onPathChange(data.currentPath);
    }
  }, [data?.currentPath, onPathChange]);

  const handleNavigate = (entryPath: string) => {
    if (entryPath === "") {
      setCurrentPath(undefined);
      return;
    }

    const newPath = `/${entryPath}`;
    setCurrentPath(newPath);
  };

  return (
    <div className="border rounded-md">
      <div className="p-3 border-b bg-muted/50">
        <p className="text-sm font-medium">
          <Trans id="directory_picker.current" />{" "}
          <span className="font-mono">{data?.currentPath || "~"}</span>
        </p>
      </div>
      <div className="p-3 border-b flex items-center gap-2">
        <Checkbox
          id="show-hidden"
          checked={showHidden}
          onCheckedChange={(checked) => setShowHidden(checked === true)}
        />
        <Label htmlFor="show-hidden" className="text-sm cursor-pointer">
          <Trans id="directory_picker.show_hidden" />
        </Label>
      </div>
      <div className="max-h-96 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Trans id="directory_picker.loading" />
          </div>
        ) : data?.entries && data.entries.length > 0 ? (
          <div className="divide-y">
            {data.entries
              .filter((entry) => entry.type === "directory")
              .filter(
                (entry) =>
                  showHidden ||
                  entry.name === ".." ||
                  !entry.name.startsWith("."),
              )
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
            <Trans id="directory_picker.no_directories" />
          </div>
        )}
      </div>
    </div>
  );
};
