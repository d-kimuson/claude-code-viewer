import { Trans } from "@lingui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BellIcon, CheckIcon } from "lucide-react";
import { type FC, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { honoClient } from "@/lib/api/client";
import { notificationsQuery } from "@/lib/api/queries";
import { cn } from "@/lib/utils";
import { formatLocaleDate } from "../../lib/date/formatLocaleDate";

interface NotificationBellProps {
  sessionId?: string;
}

export const NotificationBell: FC<NotificationBellProps> = ({ sessionId }) => {
  const queryClient = useQueryClient();

  const { data } = useQuery(notificationsQuery);
  const notifications = data?.notifications ?? [];

  const consumeMutation = useMutation({
    mutationFn: async (targetSessionId: string) => {
      await honoClient.api.notifications[":sessionId"].consume.$post({
        param: { sessionId: targetSessionId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationsQuery.queryKey,
      });
    },
  });

  // Auto-consume notifications when the target session is opened
  const consumedSessionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    if (consumedSessionRef.current === sessionId) return;

    const hasNotification = notifications.some(
      (n) => n.sessionId === sessionId,
    );
    if (hasNotification) {
      consumedSessionRef.current = sessionId;
      consumeMutation.mutate(sessionId);
    }
  }, [sessionId, notifications, consumeMutation]);

  const count = notifications.length;

  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded transition-colors",
                  count > 0
                    ? "text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
                aria-label="Notifications"
              >
                <BellIcon className="w-3.5 h-3.5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 md:top-0 md:right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <Trans id="notification.title" />
          </TooltipContent>
        </Tooltip>

        <PopoverContent
          align="end"
          className="w-[calc(100vw-2rem)] sm:w-80 p-0 z-[53]"
          sideOffset={8}
          collisionPadding={16}
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-medium">
              <Trans id="notification.title" />
            </p>
            {count > 0 && (
              <span className="text-xs text-muted-foreground">{count}</span>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckIcon className="w-5 h-5 mb-2" />
                <p className="text-xs">
                  <Trans id="notification.empty" />
                </p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    to="/projects/$projectId/session"
                    params={{ projectId: notification.projectId }}
                    search={(prev) => ({
                      ...prev,
                      sessionId: notification.sessionId,
                    })}
                    className="flex items-start gap-2.5 rounded-md p-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">
                        {notification.type === "session_paused" ? (
                          <Trans id="notification.session_paused" />
                        ) : (
                          <Trans id="notification.session_completed" />
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        {notification.sessionId}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatLocaleDate(new Date(notification.createdAt), {
                          target: "time",
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
