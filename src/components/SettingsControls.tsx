"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type FC, useCallback, useId } from "react";
import { configQueryConfig, useConfig } from "@/app/hooks/useConfig";
import { Checkbox } from "@/components/ui/checkbox";
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

  const createCollapsibleToggleHandler = (key: keyof typeof config) => {
    return async () => {
      const newConfig = {
        ...config,
        [key]: !config?.[key],
      };
      updateConfig(newConfig);
      await queryClient.invalidateQueries({
        queryKey: configQueryConfig.queryKey,
      });
      await onConfigChanged();
    };
  };

  const collapsibleSettings = [
    {
      key: "expandThinking" as const,
      label: "Thinking sections",
      description: "Show AI thinking process expanded by default",
    },
    {
      key: "expandToolUse" as const,
      label: "Tool Use sections",
      description: "Show tool usage details expanded by default",
    },
    {
      key: "expandToolResult" as const,
      label: "Tool Result sections",
      description: "Show tool execution results expanded by default",
    },
    {
      key: "expandSystemMessage" as const,
      label: "System Messages",
      description: "Show system messages expanded by default",
    },
    {
      key: "expandMetaInformation" as const,
      label: "Meta Information",
      description: "Show metadata expanded by default",
    },
    {
      key: "expandSummary" as const,
      label: "Summary sections",
      description: "Show conversation summaries expanded by default",
    },
  ];

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

      <div className="border-t pt-4 mt-6">
        <h3 className="text-sm font-medium mb-3">
          Collapsible Content Settings
        </h3>
        <div className="space-y-4">
          {collapsibleSettings.map((setting) => (
            <div key={setting.key}>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${checkboxId}-${setting.key}`}
                  checked={config?.[setting.key] ?? false}
                  onCheckedChange={createCollapsibleToggleHandler(setting.key)}
                />
                {showLabels && (
                  <label
                    htmlFor={`${checkboxId}-${setting.key}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {setting.label}
                  </label>
                )}
              </div>
              {showDescriptions && (
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  {setting.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
