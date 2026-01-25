import { Trans, useLingui } from "@lingui/react";
import { useQueryClient } from "@tanstack/react-query";
import { type FC, useId, useMemo } from "react";
import { useConfig } from "@/app/hooks/useConfig";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useTheme } from "@/hooks/useTheme";
import { projectDetailQuery, projectListQuery } from "../lib/api/queries";
import {
  DEFAULT_LOCALE,
  detectLocaleFromNavigator,
} from "../lib/i18n/localeDetection";
import type { SupportedLocale } from "../lib/i18n/schema";

interface SettingsControlsProps {
  openingProjectId: string;
  showLabels?: boolean;
  showDescriptions?: boolean;
  className?: string;
}

function isSearchHotkey(value: string): value is "ctrl-k" | "command-k" {
  return value === "ctrl-k" || value === "command-k";
}

export const SettingsControls: FC<SettingsControlsProps> = ({
  openingProjectId,
  showLabels = true,
  showDescriptions = true,
  className = "",
}: SettingsControlsProps) => {
  const checkboxId = useId();
  const enterKeyBehaviorId = useId();
  const searchHotkeyId = useId();
  const permissionModeId = useId();
  const localeId = useId();
  const themeId = useId();
  const { config, updateConfig } = useConfig();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const { i18n } = useLingui();
  const { isFlagEnabled } = useFeatureFlags();

  const isToolApprovalAvailable = isFlagEnabled("tool-approval");
  const inferredLocale = useMemo(() => {
    return detectLocaleFromNavigator() ?? DEFAULT_LOCALE;
  }, []);

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

  const handleAutoScheduleContinueOnRateLimitChange = async () => {
    const newConfig = {
      ...config,
      autoScheduleContinueOnRateLimit: !config?.autoScheduleContinueOnRateLimit,
    };
    updateConfig(newConfig);
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

  const handleSearchHotkeyChange = async (value: string) => {
    if (!isSearchHotkey(value)) {
      return;
    }
    const newConfig = {
      ...config,
      searchHotkey: value,
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

  const handleLocaleChange = async (value: SupportedLocale) => {
    const newConfig = {
      ...config,
      locale: value,
    };
    updateConfig(newConfig);
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
            <Trans id="settings.session.hide_no_user_message" />
          </label>
        )}
      </div>
      {showDescriptions && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          <Trans id="settings.session.hide_no_user_message.description" />
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
            <Trans id="settings.session.unify_same_title" />
          </label>
        )}
      </div>
      {showDescriptions && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          <Trans id="settings.session.unify_same_title.description" />
        </p>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id={`${checkboxId}-auto-schedule-continue`}
          checked={config?.autoScheduleContinueOnRateLimit}
          onCheckedChange={handleAutoScheduleContinueOnRateLimitChange}
        />
        {showLabels && (
          <label
            htmlFor={`${checkboxId}-auto-schedule-continue`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            <Trans id="settings.session.auto_schedule_continue_on_rate_limit" />
          </label>
        )}
      </div>
      {showDescriptions && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          <Trans id="settings.session.auto_schedule_continue_on_rate_limit.description" />
        </p>
      )}

      <div className="space-y-2">
        {showLabels && (
          <label
            htmlFor={enterKeyBehaviorId}
            className="text-sm font-medium leading-none"
          >
            <Trans id="settings.input.enter_key_behavior" />
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
              <Trans id="settings.input.enter_key_behavior.shift_enter" />
            </SelectItem>
            <SelectItem value="enter-send">
              <Trans id="settings.input.enter_key_behavior.enter" />
            </SelectItem>
            <SelectItem value="command-enter-send">
              <Trans id="settings.input.enter_key_behavior.command_enter" />
            </SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans id="settings.input.enter_key_behavior.description" />
          </p>
        )}
      </div>

      <div className="space-y-2">
        {showLabels && (
          <label
            htmlFor={searchHotkeyId}
            className="text-sm font-medium leading-none"
          >
            <Trans id="settings.input.search_hotkey" />
          </label>
        )}
        <Select
          value={config?.searchHotkey || "command-k"}
          onValueChange={handleSearchHotkeyChange}
        >
          <SelectTrigger id={searchHotkeyId} className="w-full">
            <SelectValue placeholder={i18n._("Select search hotkey")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ctrl-k">
              <Trans id="settings.input.search_hotkey.ctrl_k" />
            </SelectItem>
            <SelectItem value="command-k">
              <Trans id="settings.input.search_hotkey.command_k" />
            </SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans id="settings.input.search_hotkey.description" />
          </p>
        )}
      </div>

      <div className="space-y-2">
        {showLabels && (
          <label
            htmlFor={permissionModeId}
            className="text-sm font-medium leading-none"
          >
            <Trans id="settings.permission.mode" />
          </label>
        )}
        <Select
          value={config?.permissionMode || "default"}
          onValueChange={handlePermissionModeChange}
          disabled={!isToolApprovalAvailable}
        >
          <SelectTrigger id={permissionModeId} className="w-full">
            <SelectValue placeholder={i18n._("Select permission mode")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              <Trans id="settings.permission.mode.default" />
            </SelectItem>
            <SelectItem value="acceptEdits">
              <Trans id="settings.permission.mode.accept_edits" />
            </SelectItem>
            <SelectItem value="bypassPermissions">
              <Trans id="settings.permission.mode.bypass_permissions" />
            </SelectItem>
            <SelectItem value="plan">
              <Trans id="settings.permission.mode.plan" />
            </SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && isToolApprovalAvailable && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans id="settings.permission.mode.description" />
          </p>
        )}
        {showDescriptions && !isToolApprovalAvailable && (
          <p className="text-xs text-destructive mt-1">
            <Trans id="settings.permission.mode.unavailable" />
          </p>
        )}
      </div>

      <div className="space-y-2">
        {showLabels && (
          <label
            htmlFor={localeId}
            className="text-sm font-medium leading-none"
          >
            <Trans id="settings.locale" />
          </label>
        )}
        <Select
          value={config?.locale || inferredLocale}
          onValueChange={handleLocaleChange}
        >
          <SelectTrigger id={localeId} className="w-full">
            <SelectValue placeholder={i18n._("Select language")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ja">
              <Trans id="settings.locale.ja" />
            </SelectItem>
            <SelectItem value="en">
              <Trans id="settings.locale.en" />
            </SelectItem>
            <SelectItem value="zh_CN">
              <Trans id="settings.locale.zh_CN" />
            </SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans id="settings.locale.description" />
          </p>
        )}
      </div>

      <div className="space-y-2">
        {showLabels && (
          <label htmlFor={themeId} className="text-sm font-medium leading-none">
            <Trans id="settings.theme" />
          </label>
        )}
        <Select value={theme ?? "system"} onValueChange={handleThemeChange}>
          <SelectTrigger id={themeId} className="w-full">
            <SelectValue placeholder={i18n._("Select theme")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <Trans id="settings.theme.light" />
            </SelectItem>
            <SelectItem value="dark">
              <Trans id="settings.theme.dark" />
            </SelectItem>
            <SelectItem value="system">
              <Trans id="settings.theme.system" />
            </SelectItem>
          </SelectContent>
        </Select>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans id="settings.theme.description" />
          </p>
        )}
      </div>
    </div>
  );
};
