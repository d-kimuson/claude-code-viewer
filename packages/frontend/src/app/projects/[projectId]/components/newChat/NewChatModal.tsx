import { Trans } from "@lingui/react";
import { MessageSquareIcon } from "lucide-react";
import { type FC, type ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../../components/ui/dialog";
import { NewChat } from "./NewChat";

export const NewChatModal: FC<{
  projectId: string;
  trigger: ReactNode;
}> = ({ projectId, trigger }) => {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="w-[95vw] md:w-[80vw]"
        data-testid="start-new-chat-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareIcon className="w-5 h-5" />
            <Trans id="chat.modal.title" message="Start New Chat" />
          </DialogTitle>
        </DialogHeader>
        <NewChat projectId={projectId} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
};
