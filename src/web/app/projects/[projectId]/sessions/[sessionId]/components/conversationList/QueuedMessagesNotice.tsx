import { Trans } from "@lingui/react";
import { ListOrderedIcon } from "lucide-react";
import type { FC } from "react";
import { Badge } from "@/web/components/ui/badge";

type QueuedMessagesNoticeProps = {
  queuedMessages: readonly { text: string; queuedAt: string }[];
};

export const QueuedMessagesNotice: FC<QueuedMessagesNoticeProps> = ({ queuedMessages }) => {
  if (queuedMessages.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex justify-start mt-4">
      <div className="w-full max-w-3xl lg:max-w-4xl sm:w-[90%] md:w-[85%] px-2">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ListOrderedIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              <Trans id="session.queued_messages.title" message="Queued Messages" />
            </h3>
          </div>
          <div className="space-y-2">
            {queuedMessages.map((message, index) => (
              <div
                key={message.queuedAt}
                className="flex flex-col gap-2 p-3 bg-white dark:bg-gray-900 rounded border border-amber-100 dark:border-amber-900"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                  >
                    <Trans
                      id="session.queued_messages.position"
                      message="#{position}"
                      values={{ position: index + 1 }}
                    />
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  <Trans id="session.queued_messages.message_label" message="Message" />:{" "}
                  {message.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
