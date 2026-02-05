import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useLingui } from "@lingui/react";
import { PlusIcon, SettingsIcon, TrashIcon, XIcon } from "lucide-react";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CCOptionsSchema } from "@/server/core/claude-code/schema";
import {
  type CCOptionsForm,
  ccOptionsFormSchema,
  hasNonDefaultCCOptions,
  transformFormToSchema,
  transformSchemaToForm,
} from "./ccOptionsFormSchema";

type ClaudeCodeSettingsFormProps = {
  value: CCOptionsSchema | undefined;
  onChange: (value: CCOptionsSchema | undefined) => void;
  disabled?: boolean;
  showForkOption?: boolean;
  forkSession?: boolean;
  onForkSessionChange?: (fork: boolean) => void;
};

const AVAILABLE_TOOLS = [
  "Bash",
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoRead",
  "TodoWrite",
  "NotebookEdit",
  "AskUserQuestion",
];

const stableStringify = (value: unknown): string => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(",")}}`;
};

const KeyValueEditor: FC<{
  value: Record<string, string | undefined>;
  onChange: (value: Record<string, string | undefined>) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const { i18n } = useLingui();
  const entries = Object.entries(value);

  const handleAdd = () => {
    onChange({ ...value, "": "" });
  };

  const handleRemove = (key: string) => {
    const newValue = { ...value };
    delete newValue[key];
    onChange(newValue);
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    const newValue: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === oldKey) {
        newValue[newKey] = v;
      } else {
        newValue[k] = v;
      }
    }
    onChange(newValue);
  };

  const handleValueChange = (key: string, newVal: string) => {
    onChange({ ...value, [key]: newVal });
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, val], index) => (
        <div key={`env-${index}-${key}`} className="flex items-center gap-2">
          <Input
            value={key}
            onChange={(e) => handleKeyChange(key, e.target.value)}
            placeholder={i18n._("Key")}
            disabled={disabled}
            className="h-8 text-xs flex-1"
          />
          <span className="text-muted-foreground">=</span>
          <Input
            value={val ?? ""}
            onChange={(e) => handleValueChange(key, e.target.value)}
            placeholder={i18n._("Value")}
            disabled={disabled}
            className="h-8 text-xs flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(key)}
            disabled={disabled}
            className="h-8 w-8 p-0"
          >
            <TrashIcon className="w-3 h-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={disabled}
        className="h-7 text-xs"
      >
        <PlusIcon className="w-3 h-3 mr-1" />
        <Trans id="settings.env.add" />
      </Button>
    </div>
  );
};

const DisallowedToolsEditor: FC<{
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const { i18n } = useLingui();
  const [inputValue, setInputValue] = useState("");

  const handleToggle = (tool: string) => {
    if (value.includes(tool)) {
      onChange(value.filter((t) => t !== tool));
    } else {
      onChange([...value, tool]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {value.map((tool) => (
          <span
            key={tool}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
          >
            {tool}
            <button
              type="button"
              onClick={() => handleToggle(tool)}
              disabled={disabled}
              className="hover:bg-primary/20 rounded-full p-0.5"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {AVAILABLE_TOOLS.filter((tool) => !value.includes(tool)).map((tool) => (
          <button
            key={tool}
            type="button"
            onClick={() => handleToggle(tool)}
            disabled={disabled}
            className="px-2 py-0.5 text-xs rounded border border-border hover:bg-muted transition-colors"
          >
            {tool}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={i18n._("Custom tool name...")}
          disabled={disabled}
          className="h-8 text-xs flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCustom}
          disabled={disabled || !inputValue.trim()}
          className="h-8 text-xs"
        >
          <PlusIcon className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export const ClaudeCodeSettingsForm: FC<ClaudeCodeSettingsFormProps> = ({
  value,
  onChange,
  disabled = false,
  showForkOption = false,
  forkSession = true,
  onForkSessionChange,
}) => {
  const { i18n } = useLingui();

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CCOptionsForm>({
    resolver: zodResolver(ccOptionsFormSchema),
    defaultValues: transformSchemaToForm(value),
  });

  const formData = watch();
  const transformed = useMemo(
    () => transformFormToSchema(formData),
    [formData],
  );
  const lastSerialized = useRef<string | null>(null);

  // Sync form data to parent component
  useEffect(() => {
    const serialized = stableStringify(transformed);
    if (serialized === lastSerialized.current) {
      return;
    }
    lastSerialized.current = serialized;
    onChange(transformed);
  }, [transformed, onChange]);

  const usePreset = formData.systemPrompt?.mode === "preset";

  return (
    <div className="space-y-4 text-sm">
      {/* Fork Session Option */}
      {showForkOption && onForkSessionChange && (
        <div className="p-3 bg-muted/30 rounded-md">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is a custom component that wraps input */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={forkSession}
              onCheckedChange={(checked) =>
                onForkSessionChange(checked === true)
              }
              disabled={disabled}
            />
            <span className="text-xs">
              <Trans id="settings.forkSession" />
            </span>
          </label>
        </div>
      )}

      {/* Model */}
      <div className="space-y-1.5">
        <Label htmlFor="model" className="text-xs font-medium">
          <Trans id="settings.model.label" />
        </Label>
        <Input
          id="model"
          {...register("model")}
          placeholder={i18n._("e.g., claude-sonnet-4-5-20250929")}
          disabled={disabled}
          className="h-8 text-xs"
        />
        {errors.model?.message && (
          <p className="text-xs text-red-500">{errors.model.message}</p>
        )}
      </div>

      {/* Disallowed Tools */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          <Trans id="settings.disallowedTools.label" />
        </Label>
        <DisallowedToolsEditor
          value={formData.disallowedTools ?? []}
          onChange={(selected) => setValue("disallowedTools", selected)}
          disabled={disabled}
        />
        {errors.disallowedTools?.message && (
          <p className="text-xs text-red-500">
            {errors.disallowedTools.message}
          </p>
        )}
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is a custom component that wraps input */}
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={usePreset}
            onCheckedChange={(checked) => {
              if (checked) {
                setValue("systemPrompt", {
                  mode: "preset",
                  append:
                    formData.systemPrompt?.mode === "preset"
                      ? formData.systemPrompt.append
                      : undefined,
                });
              } else {
                setValue("systemPrompt", undefined);
              }
            }}
            disabled={disabled}
          />
          <span className="text-xs">
            <Trans id="settings.systemPrompt.usePreset" />
          </span>
        </label>

        {usePreset && (
          <div className="space-y-1.5">
            <Label htmlFor="systemPrompt" className="text-xs font-medium">
              <Trans
                id="settings.systemPrompt.additional"
                message="Additional System Prompt"
              />
            </Label>
            <Textarea
              id="systemPrompt"
              value={
                (formData.systemPrompt?.mode === "preset"
                  ? formData.systemPrompt.append
                  : undefined) ?? ""
              }
              onChange={(e) => {
                setValue("systemPrompt", {
                  mode: "preset",
                  append: e.target.value || undefined,
                });
              }}
              placeholder={i18n._("Additional instructions to append...")}
              disabled={disabled}
              className="text-xs min-h-[60px]"
            />
            {errors.systemPrompt?.message && (
              <p className="text-xs text-red-500">
                {errors.systemPrompt.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Environment Variables */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          <Trans id="settings.env.label" message="Environment Variables" />
        </Label>
        <KeyValueEditor
          value={formData.env ?? {}}
          onChange={(env) => setValue("env", env)}
          disabled={disabled}
        />
        {errors.env?.root?.message && (
          <p className="text-xs text-red-500">{errors.env.root.message}</p>
        )}
      </div>

      {/* Sandbox Settings */}
      <div className="space-y-2 p-3 bg-muted/30 rounded-md">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            <Trans id="settings.sandbox.label" message="Sandbox" />
          </Label>
          <Switch
            checked={formData.sandbox?.enabled ?? false}
            onCheckedChange={(checked) =>
              setValue("sandbox", {
                ...formData.sandbox,
                enabled: checked,
              })
            }
            disabled={disabled}
          />
        </div>

        {formData.sandbox?.enabled && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is a custom component that wraps input */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.sandbox?.autoAllowBashIfSandboxed ?? false}
                onCheckedChange={(checked) =>
                  setValue("sandbox", {
                    ...formData.sandbox,
                    autoAllowBashIfSandboxed: checked === true,
                  })
                }
                disabled={disabled}
              />
              <span className="text-xs">
                <Trans
                  id="settings.sandbox.autoAllowBash"
                  message="Auto-allow Bash if sandboxed"
                />
              </span>
            </label>

            {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is a custom component that wraps input */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.sandbox?.allowUnsandboxedCommands ?? false}
                onCheckedChange={(checked) =>
                  setValue("sandbox", {
                    ...formData.sandbox,
                    allowUnsandboxedCommands: checked === true,
                  })
                }
                disabled={disabled}
              />
              <span className="text-xs">
                <Trans
                  id="settings.sandbox.allowUnsandboxedCommands"
                  message="Allow unsandboxed commands"
                />
              </span>
            </label>

            {/* Network Settings */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                <Trans
                  id="settings.sandbox.network.label"
                  message="Network Settings"
                />
              </Label>

              {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is a custom component that wraps input */}
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={
                    formData.sandbox?.network?.allowLocalBinding ?? false
                  }
                  onCheckedChange={(checked) =>
                    setValue("sandbox", {
                      ...formData.sandbox,
                      network: {
                        ...formData.sandbox?.network,
                        allowLocalBinding: checked === true,
                      },
                    })
                  }
                  disabled={disabled}
                />
                <span className="text-xs">
                  <Trans
                    id="settings.sandbox.network.allowLocalBinding"
                    message="Allow local binding"
                  />
                </span>
              </label>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  <Trans
                    id="settings.sandbox.network.allowedDomains"
                    message="Allowed Domains (comma-separated)"
                  />
                </Label>
                <Input
                  value={formData.sandbox?.network?.allowedDomains ?? ""}
                  onChange={(e) => {
                    setValue("sandbox", {
                      ...formData.sandbox,
                      network: {
                        ...formData.sandbox?.network,
                        allowedDomains: e.target.value || undefined,
                      },
                    });
                  }}
                  placeholder={i18n._("e.g., api.example.com, cdn.example.com")}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        )}
        {errors.sandbox?.message && (
          <p className="text-xs text-red-500">{errors.sandbox.message}</p>
        )}
      </div>

      {/* Advanced Settings (collapsed by default) */}
      <details className="group">
        <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <Trans id="settings.advanced" message="Advanced Settings" />
        </summary>
        <div className="mt-3 space-y-4 pl-2 border-l-2 border-border/50">
          {/* Setting Sources */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              <Trans
                id="settings.settingSources.label"
                message="Setting Sources"
              />
            </Label>
            <div className="flex flex-wrap gap-2">
              {(["user", "project", "local"] as const).map((source) => {
                const currentSources = formData.settingSources ?? [
                  "user",
                  "project",
                  "local",
                ];
                const isSelected = currentSources.includes(source);
                return (
                  // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is a custom component that wraps input
                  <label
                    key={source}
                    className="inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setValue("settingSources", [
                            ...currentSources,
                            source,
                          ]);
                        } else {
                          setValue(
                            "settingSources",
                            currentSources.filter((s) => s !== source),
                          );
                        }
                      }}
                      disabled={disabled}
                    />
                    <span className="text-xs">{source}</span>
                  </label>
                );
              })}
            </div>
            {errors.settingSources?.message && (
              <p className="text-xs text-red-500">
                {errors.settingSources.message}
              </p>
            )}
          </div>

          {/* Max Turns */}
          <div className="space-y-1.5">
            <Label htmlFor="maxTurns" className="text-xs font-medium">
              <Trans id="settings.maxTurns.label" message="Max Turns" />
            </Label>
            <Input
              id="maxTurns"
              type="number"
              min={1}
              {...register("maxTurns", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
              placeholder={i18n._("e.g., 10")}
              disabled={disabled}
              className="h-8 text-xs"
            />
            {errors.maxTurns?.message && (
              <p className="text-xs text-red-500">{errors.maxTurns.message}</p>
            )}
          </div>

          {/* Max Thinking Tokens */}
          <div className="space-y-1.5">
            <Label htmlFor="maxThinkingTokens" className="text-xs font-medium">
              <Trans
                id="settings.maxThinkingTokens.label"
                message="Max Thinking Tokens"
              />
            </Label>
            <Input
              id="maxThinkingTokens"
              type="number"
              min={1}
              {...register("maxThinkingTokens", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
              placeholder={i18n._("e.g., 10000")}
              disabled={disabled}
              className="h-8 text-xs"
            />
            {errors.maxThinkingTokens?.message && (
              <p className="text-xs text-red-500">
                {errors.maxThinkingTokens.message}
              </p>
            )}
          </div>

          {/* Max Budget USD */}
          <div className="space-y-1.5">
            <Label htmlFor="maxBudgetUsd" className="text-xs font-medium">
              <Trans
                id="settings.maxBudgetUsd.label"
                message="Max Budget (USD)"
              />
            </Label>
            <Input
              id="maxBudgetUsd"
              type="number"
              min={0}
              step={0.01}
              {...register("maxBudgetUsd", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
              placeholder={i18n._("e.g., 1.00")}
              disabled={disabled}
              className="h-8 text-xs"
            />
            {errors.maxBudgetUsd?.message && (
              <p className="text-xs text-red-500">
                {errors.maxBudgetUsd.message}
              </p>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};

export const ClaudeCodeSettingsPopover: FC<{
  value: CCOptionsSchema | undefined;
  onChange: (value: CCOptionsSchema | undefined) => void;
  disabled?: boolean;
  showForkOption?: boolean;
  forkSession?: boolean;
  onForkSessionChange?: (fork: boolean) => void;
}> = ({
  value,
  onChange,
  disabled,
  showForkOption,
  forkSession,
  onForkSessionChange,
}) => {
  const [open, setOpen] = useState(false);
  const hasSettings = hasNonDefaultCCOptions(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={`gap-1.5 px-2 hover:bg-background/80 hover:text-foreground text-muted-foreground transition-all duration-200 h-8 rounded-lg ${hasSettings ? "text-primary" : ""}`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">
            <Trans id="chat.settings" message="Settings" />
          </span>
          {hasSettings && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-h-[70vh] overflow-y-auto"
        align="end"
        side="top"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">
              <Trans id="settings.title" message="Claude Code Settings" />
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-6 w-6 p-0"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
          <ClaudeCodeSettingsForm
            value={value}
            onChange={onChange}
            disabled={disabled}
            showForkOption={showForkOption}
            forkSession={forkSession}
            onForkSessionChange={onForkSessionChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
