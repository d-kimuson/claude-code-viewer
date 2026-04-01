import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ShieldAlert,
  X,
} from "lucide-react";
import { type FC, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  PermissionRequest,
  PermissionResponse,
} from "@/types/permissions";
import { useConfig } from "../app/hooks/useConfig";
import { formatLocaleDate } from "../lib/date/formatLocaleDate";

interface InlinePermissionApprovalProps {
  permissionRequest: PermissionRequest | null;
  onResponse: (response: PermissionResponse) => Promise<void>;
}

const formatValue = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const ParameterEntry: FC<{ paramKey: string; value: unknown }> = ({
  paramKey,
  value,
}) => {
  const [copied, setCopied] = useState(false);
  const formattedValue = formatValue(value);
  const isLong = formattedValue.length > 100;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {paramKey}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(formattedValue)}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3 text-green-500" />
          ) : (
            <Copy className="size-3" />
          )}
        </Button>
      </div>
      <div
        className={`rounded-md bg-muted/60 border border-border/40 px-3 py-2 ${isLong ? "max-h-32 overflow-y-auto" : ""}`}
      >
        <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed text-foreground/80">
          {formattedValue}
        </pre>
      </div>
    </div>
  );
};

export const InlinePermissionApproval: FC<InlinePermissionApprovalProps> = ({
  permissionRequest,
  onResponse,
}) => {
  const [isResponding, setIsResponding] = useState(false);
  const [isParametersExpanded, setIsParametersExpanded] = useState(false);
  const { config } = useConfig();

  if (!permissionRequest) return null;

  const handleResponse = async (decision: "allow" | "deny") => {
    setIsResponding(true);

    const response: PermissionResponse = {
      permissionRequestId: permissionRequest.id,
      decision,
    };

    try {
      await onResponse(response);
    } finally {
      setIsResponding(false);
    }
  };

  const parameterEntries = Object.entries(permissionRequest.toolInput);
  const hasParameters = parameterEntries.length > 0;

  return (
    <div className="mx-4 sm:mx-6 md:mx-8 lg:mx-12 xl:mx-16 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-orange-500/25 bg-card shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-2.5 border-b border-border/60 bg-orange-500/[0.04]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-6 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <ShieldAlert className="size-3.5" />
              </div>
              <span className="text-sm font-semibold">Permission Request</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatLocaleDate(permissionRequest.timestamp, {
                locale: config.locale,
                target: "time",
              })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 ml-[2.125rem]">
            Claude Code wants to execute a tool and needs your permission.
          </p>
        </div>

        <div className="p-4 space-y-3">
          {/* Tool name */}
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="font-mono text-xs tracking-tight"
            >
              {permissionRequest.toolName}
            </Badge>
          </div>

          {/* Parameters Section */}
          {hasParameters && (
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Collapsible
                open={isParametersExpanded}
                onOpenChange={setIsParametersExpanded}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3.5 py-2.5 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Parameters</span>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {parameterEntries.length}
                    </Badge>
                  </div>
                  {isParametersExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3.5 pb-3.5 pt-0.5 space-y-3 max-h-48 overflow-y-auto border-t border-border/40">
                    {parameterEntries.map(([key, value]) => (
                      <ParameterEntry key={key} paramKey={key} value={value} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {!hasParameters && (
            <div className="rounded-lg border border-border/60 px-3.5 py-2.5 text-center text-sm text-muted-foreground">
              No parameters
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResponse("deny")}
              disabled={isResponding}
              className="min-w-[4.5rem] gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <X className="size-3.5" />
              Deny
            </Button>
            <Button
              size="sm"
              onClick={() => handleResponse("allow")}
              disabled={isResponding}
              className="min-w-[4.5rem] gap-1.5"
            >
              <Check className="size-3.5" />
              Allow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
