import { Trans, useLingui } from "@lingui/react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, XIcon } from "lucide-react";
import { type FC, useId, useMemo, useState } from "react";
import { useConfig } from "@/app/hooks/useConfig";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { projectDetailQuery, projectListQuery } from "../lib/api/queries";
import { DEFAULT_LOCALE, detectLocaleFromNavigator } from "../lib/i18n/localeDetection";
import type { SupportedLocale } from "../lib/i18n/schema";

type SettingsControlsProps = {
  openingProjectId: string;
  showLabels?: boolean;
  showDescriptions?: boolean;
  className?: string;
};

const isSearchHotkey = (value: string): value is "ctrl-k" | "command-k" => {
  return value === "ctrl-k" || value === "command-k";
};

export const SettingsControls: FC<SettingsControlsProps> = ({
  openingProjectId,
  showLabels = true,
  showDescriptions = true,
  className = "",
}: SettingsControlsProps) => {
  const [newModelChoice, setNewModelChoice] = useState("");
  const checkboxId = useId();
  const enterKeyBehaviorId = useId();
  const searchHotkeyId = useId();
  const localeId = useId();
  const themeId = useId();
  const { config, updateConfig } = useConfig();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const { i18n } = useLingui();

  const inferredLocale = useMemo(() => {
    return detectLocaleFromNavigator() ?? DEFAULT_LOCALE;
  }, []);

  const handleHideNoUserMessageChange = () => {
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

  const handleUnifySameTitleChange = () => {
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

  const handleAutoScheduleContinueOnRateLimitChange = () => {
    const newConfig = {
      ...config,
      autoScheduleContinueOnRateLimit: !config?.autoScheduleContinueOnRateLimit,
    };
    updateConfig(newConfig);
  };

  const enterKeyBehaviors = ["shift-enter-send", "enter-send", "command-enter-send"] as const;

  const handleEnterKeyBehaviorChange = (value: string) => {
    const matched = enterKeyBehaviors.find((b) => b === value);
    if (matched === undefined) return;
    const newConfig = {
      ...config,
      enterKeyBehavior: matched,
    };
    updateConfig(newConfig);
  };

  const handleSearchHotkeyChange = (value: string) => {
    if (!isSearchHotkey(value)) {
      return;
    }
    const newConfig = {
      ...config,
      searchHotkey: value,
    };
    updateConfig(newConfig);
  };

  const handleAddModelChoice = () => {
    const trimmed = newModelChoice.trim();
    if (trimmed && !config?.modelChoices?.includes(trimmed)) {
      updateConfig({
        ...config,
        modelChoices: [...(config?.modelChoices ?? []), trimmed],
      });
      setNewModelChoice("");
    }
  };

  const handleRemoveModelChoice = (choice: string) => {
    updateConfig({
      ...config,
      modelChoices: (config?.modelChoices ?? []).filter((c) => c !== choice),
    });
  };

  const handleLocaleChange = (value: SupportedLocale) => {
    const newConfig = {
      ...config,
      locale: value,
    };
    updateConfig(newConfig);
  };

  const handleThemeChange = (value: "light" | "dark" | "system") => {
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
          <label htmlFor={enterKeyBehaviorId} className="text-sm font-medium leading-none">
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
          <label htmlFor={searchHotkeyId} className="text-sm font-medium leading-none">
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
          <span className="text-sm font-medium leading-none block">
            <Trans id="settings.model_choices.label" message="Model Choices" />
          </span>
        )}
        <div className="flex flex-wrap gap-1.5">
          {(config?.modelChoices ?? []).map((choice) => (
            <span
              key={choice}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
            >
              {choice}
              <button
                type="button"
                onClick={() => handleRemoveModelChoice(choice)}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newModelChoice}
            onChange={(e) => setNewModelChoice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddModelChoice();
              }
            }}
            placeholder={i18n._({
              id: "settings.model_choices.placeholder",
              message: "Add model choice...",
            })}
            className="h-8 text-xs flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddModelChoice}
            disabled={!newModelChoice.trim()}
            className="h-8 text-xs"
          >
            <PlusIcon className="w-3 h-3" />
          </Button>
        </div>
        {showDescriptions && (
          <p className="text-xs text-muted-foreground mt-1">
            <Trans
              id="settings.model_choices.description"
              message="Configure the model options available in the session toolbar"
            />
          </p>
        )}
      </div>

      <div className="space-y-2">
        {showLabels && (
          <label htmlFor={localeId} className="text-sm font-medium leading-none">
            <Trans id="settings.locale" />
          </label>
        )}
        <Select value={config?.locale || inferredLocale} onValueChange={handleLocaleChange}>
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
