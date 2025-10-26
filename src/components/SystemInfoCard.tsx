import { Trans } from "@lingui/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { type FC, type ReactNode, useState } from "react";
import {
  claudeCodeFeaturesQuery,
  claudeCodeMetaQuery,
  systemVersionQuery,
} from "@/lib/api/queries";
import { Badge } from "./ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface FeatureInfo {
  title: ReactNode;
  description: ReactNode;
}

const getFeatureInfo = (featureName: string): FeatureInfo => {
  switch (featureName) {
    case "canUseTool":
      return {
        title: (
          <Trans
            id="system_info.feature.can_use_tool.title"
            message="Tool Use Permission Control"
          />
        ),
        description: (
          <Trans
            id="system_info.feature.can_use_tool.description"
            message="Dynamically control tool usage permissions and request user approval before tool execution (v1.0.82+)"
          />
        ),
      };
    case "uuidOnSDKMessage":
      return {
        title: (
          <Trans
            id="system_info.feature.uuid_on_sdk_message.title"
            message="Message UUID Support"
          />
        ),
        description: (
          <Trans
            id="system_info.feature.uuid_on_sdk_message.description"
            message="Adds unique identifiers to SDK messages for better tracking (v1.0.86+)"
          />
        ),
      };
    case "agentSdk":
      return {
        title: (
          <Trans
            id="system_info.feature.agent_sdk.title"
            message="Claude Agent SDK"
          />
        ),
        description: (
          <Trans
            id="system_info.feature.agent_sdk.description"
            message="Uses Claude Agent SDK instead of Claude Code SDK (v1.0.125+)"
          />
        ),
      };
    default:
      return {
        title: featureName,
        description: (
          <Trans
            id="system_info.feature.unknown.description"
            message="Feature information not available"
          />
        ),
      };
  }
};

export const SystemInfoCard: FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: versionData } = useSuspenseQuery({
    ...systemVersionQuery,
  });

  const { data: claudeCodeMetaData } = useSuspenseQuery({
    ...claudeCodeMetaQuery,
  });

  const { data: claudeCodeFeaturesData } = useSuspenseQuery({
    ...claudeCodeFeaturesQuery,
  });

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-sidebar-border p-4">
        <h2 className="font-semibold text-lg">
          <Trans id="system_info.title" message="System Information" />
        </h2>
        <p className="text-xs text-sidebar-foreground/70">
          <Trans
            id="system_info.description"
            message="Version and feature information"
          />
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Claude Code Viewer Version */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-sidebar-foreground">
            <Trans
              id="system_info.viewer_version"
              message="Claude Code Viewer"
            />
          </h3>
          <div className="flex justify-between items-center pl-2">
            <span className="text-xs text-sidebar-foreground/70">
              <Trans id="system_info.version_label" message="Version" />
            </span>
            <Badge variant="secondary" className="text-xs font-mono">
              v{versionData?.version || "Unknown"}
            </Badge>
          </div>
        </div>

        {/* Claude Code Information */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-sidebar-foreground">
            <Trans id="system_info.claude_code" message="Claude Code" />
          </h3>
          <div className="space-y-2 pl-2">
            <div className="space-y-1">
              <div className="text-xs text-sidebar-foreground/70">
                <Trans id="system_info.executable_path" message="Executable" />
              </div>
              <div className="text-xs text-sidebar-foreground font-mono break-all">
                {claudeCodeMetaData?.executablePath || (
                  <span className="text-sidebar-foreground/50">
                    <Trans id="system_info.unknown" message="Unknown" />
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-sidebar-foreground/70">
                <Trans id="system_info.version_label" message="Version" />
              </span>
              <Badge variant="secondary" className="text-xs font-mono">
                {claudeCodeMetaData?.version || (
                  <Trans id="system_info.unknown" message="Unknown" />
                )}
              </Badge>
            </div>
          </div>
        </div>

        {/* Available Features */}
        <div className="space-y-3">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger className="flex w-full items-center justify-between group">
              <h3 className="font-medium text-sm text-sidebar-foreground">
                <Trans
                  id="system_info.available_features"
                  message="Available Features"
                />
              </h3>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/70 group-hover:text-sidebar-foreground transition-colors" />
              ) : (
                <ChevronRight className="h-4 w-4 text-sidebar-foreground/70 group-hover:text-sidebar-foreground transition-colors" />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-3">
              <TooltipProvider>
                <ul className="space-y-2 pl-2">
                  {claudeCodeFeaturesData?.features.map(({ name, enabled }) => {
                    const featureInfo = getFeatureInfo(name);
                    return (
                      <li key={name} className="flex items-start gap-2">
                        {enabled ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-sidebar-foreground/30 mt-0.5 flex-shrink-0" />
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={
                                enabled
                                  ? "text-xs text-sidebar-foreground cursor-help"
                                  : "text-xs text-sidebar-foreground/50 line-through cursor-help"
                              }
                            >
                              {featureInfo.title}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-xs text-xs"
                          >
                            {featureInfo.description}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              </TooltipProvider>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
};
