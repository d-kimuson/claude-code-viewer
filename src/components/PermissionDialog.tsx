"use client";

import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  PermissionRequest,
  PermissionResponse,
} from "@/types/permissions";
import { useConfig } from "../app/hooks/useConfig";
import { formatLocaleDate } from "../lib/date/formatLocaleDate";

interface PermissionDialogProps {
  permissionRequest: PermissionRequest | null;
  isOpen: boolean;
  onResponse: (response: PermissionResponse) => void;
}

export const PermissionDialog = ({
  permissionRequest,
  isOpen,
  onResponse,
}: PermissionDialogProps) => {
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

  const formatValue = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "boolean") return value.toString();
    if (typeof value === "number") return value.toString();
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const renderParameterValue = (key: string, value: unknown) => {
    const formattedValue = formatValue(value);
    const isLong = formattedValue.length > 100;

    return (
      <div key={key} className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{key}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(formattedValue)}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div
          className={`text-xs font-mono bg-muted p-2 rounded ${isLong ? "max-h-32 overflow-y-auto" : ""}`}
        >
          <pre className="whitespace-pre-wrap break-words">
            {formattedValue}
          </pre>
        </div>
      </div>
    );
  };

  const parameterEntries = Object.entries(permissionRequest.toolInput);
  const hasParameters = parameterEntries.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => !isResponding}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-orange-600">⚠️</span>
            Claude Code Permission Request
          </DialogTitle>
          <DialogDescription>
            Claude Code wants to execute the following tool and needs your
            permission.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Tool Information */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {permissionRequest.toolName}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatLocaleDate(permissionRequest.timestamp, {
                  locale: config.locale,
                  target: "time",
                })}
              </span>
            </div>
          </div>

          {/* Parameters Section */}
          {hasParameters && (
            <div className="rounded-lg border">
              <Collapsible
                open={isParametersExpanded}
                onOpenChange={setIsParametersExpanded}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Tool Parameters</span>
                      <Badge variant="outline" className="text-xs">
                        {parameterEntries.length} parameter
                        {parameterEntries.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {isParametersExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {parameterEntries.map(([key, value]) =>
                      renderParameterValue(key, value),
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {!hasParameters && (
            <div className="rounded-lg border p-4 text-center text-muted-foreground">
              This tool has no parameters.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleResponse("deny")}
            disabled={isResponding}
            className="min-w-20"
          >
            Deny
          </Button>
          <Button
            onClick={() => handleResponse("allow")}
            disabled={isResponding}
            className="min-w-20"
          >
            Allow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
