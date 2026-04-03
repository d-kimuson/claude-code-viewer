import { Trans, useLingui } from "@lingui/react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { type UseMutationResult, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, LoaderIcon, PlusIcon, XIcon } from "lucide-react";
import { type FC, useId, useMemo } from "react";
import type { CCOptionsSchema } from "@/server/core/claude-code/schema";
import type { PublicSessionProcess } from "@/types/session-process";
import { Button } from "@/web/components/ui/button";
import { Checkbox } from "@/web/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/web/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/web/components/ui/tooltip";
import { useFeatureFlags } from "@/web/hooks/useFeatureFlags";
import { claudeCommandsQuery } from "@/web/lib/api/queries";

const AGENT_NONE_VALUE = "__none__";

type AgentInfo = {
  name: string;
  description: string | null;
};

type ChatActionMenuProps = {
  projectId: string;
  isPending?: boolean;
  onScrollToTop?: () => void;
  onScrollToBottom?: () => void;
  sessionProcess?: PublicSessionProcess;
  abortTask?: UseMutationResult<unknown, Error, string, unknown>;
  isNewChat?: boolean;
  enableCCOptions?: boolean;
  ccOptions?: CCOptionsSchema;
  onCCOptionsChange?: (value: CCOptionsSchema | undefined) => void;
};

export const ChatActionMenu: FC<ChatActionMenuProps> = ({
  projectId,
  isPending = false,
  onScrollToTop,
  onScrollToBottom,
  sessionProcess,
  abortTask,
  isNewChat = false,
  enableCCOptions = false,
  ccOptions,
  onCCOptionsChange,
}) => {
  const { i18n } = useLingui();
  const systemPromptId = useId();
  const navigate = useNavigate({ from: "/projects/$projectId/session" });
  const { isFlagEnabled } = useFeatureFlags();
  const isToolApprovalAvailable = isFlagEnabled("tool-approval");

  const { data: commandData } = useQuery({
    ...claudeCommandsQuery(projectId),
    staleTime: 1000 * 60 * 5,
  });

  const availableAgents: AgentInfo[] = useMemo(() => {
    const global = commandData?.globalAgents ?? [];
    const project = commandData?.projectAgents ?? [];
    return [...global, ...project];
  }, [commandData?.globalAgents, commandData?.projectAgents]);

  const handleStartNewChat = () => {
    void navigate({
      to: "/projects/$projectId/session",
      params: { projectId },
      search: { sessionId: undefined },
    });
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mb-1">
      <div className="py-0 flex items-center gap-1.5 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending || isNewChat}
          className="h-7 px-2 gap-1.5 text-xs bg-muted/20 rounded-lg border border-border/40"
          data-testid="start-new-chat-button"
          onClick={handleStartNewChat}
          title={i18n._({
            id: "control.new_chat",
            message: "New Chat",
          })}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            <Trans id="control.new" />
          </span>
        </Button>
        {onScrollToTop && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onScrollToTop}
            disabled={isPending}
            className="h-7 px-2 gap-1.5 text-xs bg-muted/20 rounded-lg border border-border/40"
            title={i18n._({
              id: "control.scroll_to_top",
              message: "Scroll to Top",
            })}
          >
            <ArrowUpIcon className="w-3.5 h-3.5" />
          </Button>
        )}
        {onScrollToBottom && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onScrollToBottom}
            disabled={isPending}
            className="h-7 px-2 gap-1.5 text-xs bg-muted/20 rounded-lg border border-border/40"
            title={i18n._({
              id: "control.scroll_to_bottom",
              message: "Scroll to Bottom",
            })}
          >
            <ArrowDownIcon className="w-3.5 h-3.5" />
          </Button>
        )}
        {sessionProcess && abortTask && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              abortTask.mutate(sessionProcess.id);
            }}
            disabled={abortTask.isPending || isPending}
            className="h-7 px-2 gap-1.5 text-xs rounded-lg"
          >
            {abortTask.isPending ? (
              <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XIcon className="w-3.5 h-3.5" />
            )}
            <span>
              <Trans id="session.conversation.abort" />
            </span>
          </Button>
        )}

        {enableCCOptions && onCCOptionsChange && (
          <>
            {/* Permission mode selector */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Select
                    value={ccOptions?.permissionMode ?? "default"}
                    onValueChange={(
                      value: "default" | "acceptEdits" | "bypassPermissions" | "plan",
                    ) =>
                      onCCOptionsChange({
                        ...ccOptions,
                        permissionMode: value,
                      })
                    }
                    disabled={isPending || !isToolApprovalAvailable}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[80px] text-[11px] font-medium bg-background/50 border-border/30 shadow-none hover:bg-background hover:border-border/50 transition-all duration-200 gap-1 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        <Trans id="chat.toolbar.permission_mode.default" message="Default" />
                      </SelectItem>
                      <SelectItem value="acceptEdits">
                        <Trans
                          id="chat.toolbar.permission_mode.accept_edits"
                          message="Accept Edits"
                        />
                      </SelectItem>
                      <SelectItem value="bypassPermissions">
                        <Trans id="chat.toolbar.permission_mode.bypass" message="Bypass" />
                      </SelectItem>
                      <SelectItem value="plan">
                        <Trans id="chat.toolbar.permission_mode.plan" message="Plan" />
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <Trans id="chat.toolbar.permission_mode.tooltip" message="Select permission mode" />
              </TooltipContent>
            </Tooltip>

            {/* System prompt preset checkbox */}
            <Tooltip>
              <TooltipTrigger asChild>
                <label
                  htmlFor={systemPromptId}
                  className="flex items-center gap-1.5 cursor-pointer h-7 px-2 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-background/80 hover:text-foreground transition-all duration-200"
                >
                  <Checkbox
                    id={systemPromptId}
                    checked={ccOptions?.systemPrompt !== undefined}
                    onCheckedChange={(checked) => {
                      onCCOptionsChange({
                        ...ccOptions,
                        systemPrompt:
                          checked === true
                            ? {
                                type: "preset",
                                preset: "claude_code",
                              }
                            : undefined,
                      });
                    }}
                    disabled={isPending}
                    className="h-3.5 w-3.5"
                  />
                  <span className="whitespace-nowrap">Claude Code</span>
                </label>
              </TooltipTrigger>
              <TooltipContent>
                <Trans
                  id="chat.toolbar.system_prompt.tooltip"
                  message="Include default Claude Code prompt"
                />
              </TooltipContent>
            </Tooltip>

            {/* Agent selector */}
            {availableAgents.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Select
                      value={ccOptions?.agent ?? AGENT_NONE_VALUE}
                      onValueChange={(value: string) =>
                        onCCOptionsChange({
                          ...ccOptions,
                          agent: value === AGENT_NONE_VALUE ? undefined : value,
                        })
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-7 w-auto min-w-[80px] text-[11px] font-medium bg-background/50 border-border/30 shadow-none hover:bg-background hover:border-border/50 transition-all duration-200 gap-1 px-2">
                        <SelectValue
                          placeholder={i18n._({
                            id: "chat.toolbar.agent.none",
                            message: "No Agent",
                          })}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AGENT_NONE_VALUE}>
                          <Trans id="chat.toolbar.agent.none" message="No Agent" />
                        </SelectItem>
                        {availableAgents.map((agent) => (
                          <SelectPrimitive.Item
                            key={agent.name}
                            value={agent.name}
                            className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                          >
                            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                              <SelectPrimitive.ItemIndicator>
                                <CheckIcon className="h-4 w-4" />
                              </SelectPrimitive.ItemIndicator>
                            </span>
                            <SelectPrimitive.ItemText>{agent.name}</SelectPrimitive.ItemText>
                            {agent.description !== null && (
                              <span className="ml-1.5 text-muted-foreground truncate max-w-[200px]">
                                — {agent.description}
                              </span>
                            )}
                          </SelectPrimitive.Item>
                        ))}
                      </SelectContent>
                    </Select>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <Trans id="chat.toolbar.agent.tooltip" message="Select agent" />
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  );
};
