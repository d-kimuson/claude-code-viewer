"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type FC, useCallback, useId } from "react";
import { configQueryConfig, useConfig } from "@/app/hooks/useConfig";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectQueryConfig } from "../app/projects/[projectId]/hooks/useProject";

interface SettingsControlsProps {
  openingProjectId: string;
  showLabels?: boolean;
  showDescriptions?: boolean;
  className?: string;
}

export const SettingsControls: FC<SettingsControlsProps> = ({
  openingProjectId,
  showLabels = true,
  showDescriptions = true,
  className = "",
}: SettingsControlsProps) => {
  const checkboxId = useId();
  const enterKeyBehaviorId = useId();
  const { config, updateConfig } = useConfig();
  const queryClient = useQueryClient();

  const onConfigChanged = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: configQueryConfig.queryKey,
    });
    await queryClient.invalidateQueries({
      queryKey: ["projects"],
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryConfig(openingProjectId).queryKey,
    });
  }, [queryClient, openingProjectId]);

  const handleHideNoUserMessageChange = async () => {
    const newConfig = {
      ...config,
      hideNoUserMessageSession: !config?.hideNoUserMessageSession,
    };
    updateConfig(newConfig);
    await onConfigChanged();
  };

  const handleUnifySameTitleChange = async () => {
    const newConfig = {
      ...config,
      unifySameTitleSession: !config?.unifySameTitleSession,
    };
    updateConfig(newConfig);
    await onConfigChanged();
  };

  const handleEnterKeyBehaviorChange = async (value: string) => {
    const newConfig = {
      ...config,
      enterKeyBehavior: value as "shift-enter-send" | "enter-send",
    };
    updateConfig(newConfig);
    await onConfigChanged();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={checkboxId}
          checked={config?.hideNoUserMessageSession}
          onCheckedChange={handleHideNoUserMessageChange}
        />
        {showLabels && (
          <label
            htmlFor={checkboxId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Hide sessions without user messages
          </label>
        )}
      </div>
      {showDescriptions && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Only show sessions that contain user commands or messages
        </p>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id={`${checkboxId}-unify`}
          checked={config?.unifySameTitleSession}
          onCheckedChange={handleUnifySameTitleChange}
        />
        {showLabels && (
          <label
            htmlFor={`${checkboxId}-unify`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Unify sessions with same title
          </label>
        )}
      </div>
      {showDescriptions && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Show only the latest session when multiple sessions have the same
          title
        </p>
      )}

      <div className="space-y-2">
        {showLabels && (
          <label
            htmlFor={enterKeyBehaviorId}
            className="text-sm font-medium leading-none"
          >
            Enter Key Behavior
          </label>
        )}
        <Select
          value={config?.enterKeyBehavior || "shift-enter-send"}
          onValueChange={handleEnterKeyBehaviorChange}
        >
          <SelectTrigger id={enterKeyBehaviorId} className="w-full">
            <SelectValue placeholder="Select enter key behavior" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shift-enter-send">
              Shift+Enter to send (default)
            </SelectItem>
            <SelectItem value="enter-send">Enter to send</SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            Choose how the Enter key behaves in message input
          </p>
        )}
      </div>
    </div>
  );
};
