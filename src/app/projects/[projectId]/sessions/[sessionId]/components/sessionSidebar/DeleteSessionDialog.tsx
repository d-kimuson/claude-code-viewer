import { Trans, useLingui } from "@lingui/react";
import type { FC } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteSession } from "../../hooks/useDeleteSession";

type DeleteSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sessionId: string;
  sessionTitle: string;
  onSuccess?: () => void;
};

export const DeleteSessionDialog: FC<DeleteSessionDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  sessionId,
  sessionTitle,
  onSuccess,
}) => {
  const { i18n } = useLingui();
  const deleteSession = useDeleteSession();

  const handleDelete = () => {
    deleteSession.mutate(
      { projectId, sessionId },
      {
        onSuccess: () => {
          toast.success(
            i18n._({
              id: "session.delete.success",
              message: "Session deleted successfully",
            }),
          );
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(
            i18n._({
              id: "session.delete.failed",
              message: "Failed to delete session",
            }),
            {
              description: error.message,
            },
          );
        },
      },
    );
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            <Trans id="session.delete_dialog.title" />
          </DialogTitle>
          <DialogDescription className="break-words line-clamp-10">
            <Trans
              id="session.delete_dialog.description"
              values={{ title: sessionTitle }}
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={deleteSession.isPending}
          >
            <Trans id="common.cancel" />
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteSession.isPending}
          >
            {deleteSession.isPending ? (
              <Trans id="common.deleting" />
            ) : (
              <Trans id="common.delete" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
