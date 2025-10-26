import { Trans, useLingui } from "@lingui/react";
import { useQueryClient } from "@tanstack/react-query";
import { type FC, useId } from "react";
import { useConfig } from "@/app/hooks/useConfig";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { projectDetailQuery, projectListQuery } from "../lib/api/queries";

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
  const permissionModeId = useId();
  const localeId = useId();
  const themeId = useId();
  const { config, updateConfig } = useConfig();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const { i18n } = useLingui();

  const handleHideNoUserMessageChange = async () => {
    const newConfig = {
      ...config,
      hideNoUserMessageSession: !config?.hideNoUserMessageSession,
    };
    updateConfig(newConfig, {
      onSuccess: async () => {
        await queryClient.refetchQueries({
          queryKey: projectListQuery.queryKey,
        });
      },
    });
  };

  const handleUnifySameTitleChange = async () => {
    const newConfig = {
      ...config,
      unifySameTitleSession: !config?.unifySameTitleSession,
    };
    updateConfig(newConfig, {
      onSuccess: async () => {
        await queryClient.refetchQueries({
          queryKey: projectDetailQuery(openingProjectId).queryKey,
        });
      },
    });
  };

  const handleEnterKeyBehaviorChange = async (value: string) => {
    const newConfig = {
      ...config,
      enterKeyBehavior: value as
        | "shift-enter-send"
        | "enter-send"
        | "command-enter-send",
    };
    updateConfig(newConfig);
  };

  const handlePermissionModeChange = async (value: string) => {
    const newConfig = {
      ...config,
      permissionMode: value as
        | "acceptEdits"
        | "bypassPermissions"
        | "default"
        | "plan",
    };
    updateConfig(newConfig);
  };

  const handleLocaleChange = async (value: string) => {
    const newConfig = {
      ...config,
      locale: value as "ja" | "en",
    };
    updateConfig(newConfig, {
      onSuccess: async () => {
        window.location.reload();
      },
    });
  };

  const handleThemeChange = async (value: "light" | "dark" | "system") => {
    const newConfig = {
      ...config,
      theme: value,
    };
    updateConfig(newConfig);
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
            <Trans
              id="settings.session.hide_no_user_message"
              message="Hide sessions without user messages"
            />
          </label>
        )}
      </div>
      {showDescriptions && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          <Trans
            id="settings.session.hide_no_user_message.description"
            message="Only show sessions that contain user commands or messages"
          />
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
            <Trans
              id="settings.session.unify_same_title"
              message="Unify sessions with same title"
            />
          </label>
        )}
      </div>
      {showDescriptions && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          <Trans
            id="settings.session.unify_same_title.description"
            message="Show only the latest session when multiple sessions have the same title"
          />
        </p>
      )}

      <div className="space-y-2">
        {showLabels && (
          <label
            htmlFor={enterKeyBehaviorId}
            className="text-sm font-medium leading-none"
          >
            <Trans
              id="settings.input.enter_key_behavior"
              message="Enter Key Behavior"
            />
          </label>
        )}
        <Select
          value={config?.enterKeyBehavior || "shift-enter-send"}
          onValueChange={handleEnterKeyBehaviorChange}
        >
          <SelectTrigger id={enterKeyBehaviorId} className="w-full">
            <SelectValue placeholder={i18n._("Select enter key behavior")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shift-enter-send">
              <Trans
                id="settings.input.enter_key_behavior.shift_enter"
                message="Shift+Enter to send (default)"
              />
            </SelectItem>
            <SelectItem value="enter-send">
              <Trans
                id="settings.input.enter_key_behavior.enter"
                message="Enter to send"
              />
            </SelectItem>
            <SelectItem value="command-enter-send">
              <Trans
                id="settings.input.enter_key_behavior.command_enter"
                message="Command+Enter to send"
              />
            </SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans
              id="settings.input.enter_key_behavior.description"
              message="Choose how the Enter key behaves in message input"
            />
          </p>
        )}
      </div>

      <div className="space-y-2">
        {showLabels && (
          <label
            htmlFor={permissionModeId}
            className="text-sm font-medium leading-none"
          >
            <Trans id="settings.permission.mode" message="Permission Mode" />
          </label>
        )}
        <Select
          value={config?.permissionMode || "default"}
          onValueChange={handlePermissionModeChange}
        >
          <SelectTrigger id={permissionModeId} className="w-full">
            <SelectValue placeholder={i18n._("Select permission mode")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              <Trans
                id="settings.permission.mode.default"
                message="Default (Ask permission)"
              />
            </SelectItem>
            <SelectItem value="acceptEdits">
              <Trans
                id="settings.permission.mode.accept_edits"
                message="Accept Edits (Auto-approve file edits)"
              />
            </SelectItem>
            <SelectItem value="bypassPermissions">
              <Trans
                id="settings.permission.mode.bypass_permissions"
                message="Bypass Permissions (No prompts)"
              />
            </SelectItem>
            <SelectItem value="plan">
              <Trans
                id="settings.permission.mode.plan"
                message="Plan Mode (Planning only)"
              />
            </SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans
              id="settings.permission.mode.description"
              message="Control how Claude Code handles permission requests for file operations"
            />
          </p>
        )}
      </div>

      <div className="space-y-2">
        {showLabels && (
          <label
            htmlFor={localeId}
            className="text-sm font-medium leading-none"
          >
            <Trans id="settings.locale" message="Language" />
          </label>
        )}
        <Select
          value={config?.locale || "ja"}
          onValueChange={handleLocaleChange}
        >
          <SelectTrigger id={localeId} className="w-full">
            <SelectValue placeholder={i18n._("Select language")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ja">
              <Trans id="settings.locale.ja" message="日本語" />
            </SelectItem>
            <SelectItem value="en">
              <Trans id="settings.locale.en" message="English" />
            </SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans
              id="settings.locale.description"
              message="Choose your preferred language"
            />
          </p>
        )}
      </div>

      <div className="space-y-2">
        {showLabels && (
          <label htmlFor={themeId} className="text-sm font-medium leading-none">
            <Trans id="settings.theme" message="Theme" />
          </label>
        )}
        <Select value={theme ?? "system"} onValueChange={handleThemeChange}>
          <SelectTrigger id={themeId} className="w-full">
            <SelectValue placeholder={i18n._("Select theme")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <Trans id="settings.theme.light" message="Light" />
            </SelectItem>
            <SelectItem value="dark">
              <Trans id="settings.theme.dark" message="Dark" />
            </SelectItem>
            <SelectItem value="system">
              <Trans id="settings.theme.system" message="System" />
            </SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans
              id="settings.theme.description"
              message="Choose your preferred color theme"
            />
          </p>
        )}
      </div>
    </div>
  );
};
