import { Trans, useLingui } from "@lingui/react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GitCompareIcon,
  LoaderIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import type { PublicSessionProcess } from "../../../../../../../types/session-process";

interface ChatActionMenuProps {
  projectId: string;
  isPending?: boolean;
  onScrollToTop?: () => void;
  onScrollToBottom?: () => void;
  onOpenDiffModal?: () => void;
  sessionProcess?: PublicSessionProcess;
  abortTask?: UseMutationResult<unknown, Error, string, unknown>;
  isNewChat?: boolean;
}

export const ChatActionMenu: FC<ChatActionMenuProps> = ({
  projectId,
  isPending = false,
  onScrollToTop,
  onScrollToBottom,
  onOpenDiffModal,
  sessionProcess,
  abortTask,
  isNewChat = false,
}) => {
  const { i18n } = useLingui();
  const navigate = useNavigate();

  const handleStartNewChat = () => {
    navigate({
      to: "/projects/$projectId/session",
      params: { projectId },
      search: (prev) => {
        const { sessionId: _removed, ...rest } = prev;
        return rest;
      },
    });
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mb-1">
      <div className="py-0 flex items-center gap-1.5 flex-wrap">
        {onOpenDiffModal && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenDiffModal}
            disabled={isPending}
            className="h-7 px-2 gap-1.5 text-xs bg-muted/20 rounded-lg border border-border/40"
            title={i18n._({
              id: "control.open_git_dialog",
              message: "Open Git Dialog",
            })}
          >
            <GitCompareIcon className="w-3.5 h-3.5" />
            <span>
              <Trans id="control.git" />
            </span>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending || isNewChat}
          className="h-7 px-2 gap-1.5 text-xs bg-muted/20 rounded-lg border border-border/40"
          onClick={handleStartNewChat}
          title={i18n._({
            id: "control.new_chat",
            message: "New Chat",
          })}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>
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
            className="h-7 px-2 gap-1.5 text-xs bg-muted/20 rounded-lg border border-border/40"
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
      </div>
    </div>
  );
};
