import type { FC } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const TOOL_TYPES = ["Edit", "Bash", "Read", "Write", "Glob", "Grep"] as const;

type ToolTypeMultiSelectProps = {
  selectedTypes: Set<string>;
  onSelectionChange: (selectedTypes: Set<string>) => void;
};

export const ToolTypeMultiSelect: FC<ToolTypeMultiSelectProps> = ({
  selectedTypes,
  onSelectionChange,
}) => {
  const handleToggle = (toolType: string, checked: boolean) => {
    const newSelection = new Set(selectedTypes);
    if (checked) {
      newSelection.add(toolType);
    } else {
      newSelection.delete(toolType);
    }
    onSelectionChange(newSelection);
  };

  return (
    <div className="space-y-2">
      {TOOL_TYPES.map((toolType) => (
        <div key={toolType} className="flex items-center space-x-2">
          <Checkbox
            id={`tool-type-${toolType}`}
            checked={selectedTypes.has(toolType)}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") {
                handleToggle(toolType, checked);
              }
            }}
          />
          <Label
            htmlFor={`tool-type-${toolType}`}
            className="text-sm font-normal cursor-pointer"
          >
            {toolType}
          </Label>
        </div>
      ))}
    </div>
  );
};
