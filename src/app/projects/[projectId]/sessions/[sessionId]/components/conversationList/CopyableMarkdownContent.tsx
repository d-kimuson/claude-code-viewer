import { useLingui } from "@lingui/react";
import { CopyIcon } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "../../../../../../components/MarkdownContent";

type CopyableMarkdownContentProps = {
  content: string;
  className?: string;
  placement?: "user" | "assistant";
};

export const CopyableMarkdownContent: FC<CopyableMarkdownContentProps> = ({
  content,
  className,
  placement = "user",
}) => {
  const { i18n } = useLingui();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(
        i18n._({
          id: "conversation.copy.success",
          message: "Message copied",
        }),
      );
    } catch (error) {
      console.error("Failed to copy message:", error);
      toast.error(
        i18n._({
          id: "conversation.copy.failed",
          message: "Failed to copy message",
        }),
      );
    }
  };

  const copyLabel = i18n._({
    id: "conversation.copy",
    message: "Copy message",
  });

  return (
    <div className="group relative">
      <MarkdownContent content={content} className={className} />
      <div
        className={cn("pointer-events-none absolute", {
          "right-2 bottom-6": placement === "user",
          "right-0 bottom-0 translate-x-1": placement === "assistant",
        })}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="pointer-events-auto h-7 w-7 bg-background/85 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 backdrop-blur supports-[backdrop-filter]:bg-background/70"
          onClick={() => {
            void handleCopy();
          }}
          aria-label={copyLabel}
          title={copyLabel}
        >
          <CopyIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
