import { Trans } from "@lingui/react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { type FC, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { honoClient } from "@/lib/api/client";
import { DirectoryPicker } from "./DirectoryPicker";

export const SetupProjectDialog: FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const navigate = useNavigate();

  const setupProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await honoClient.api.projects.$post({
        json: { projectPath: selectedPath },
      });

      if (!response.ok) {
        throw new Error("Failed to set up project");
      }

      return await response.json();
    },

    onSuccess: (result) => {
      toast.success("Project set up successfully");
      setOpen(false);
      navigate({
        to: "/projects/$projectId/sessions/$sessionId",
        params: {
          projectId: result.projectId,
          sessionId: result.sessionId,
        },
      });
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to set up project",
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="new-project-button">
          <Plus className="w-4 h-4 mr-2" />
          <Trans id="project.new" message="New Project" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" data-testid="new-project-modal">
        <DialogHeader>
          <DialogTitle>
            <Trans id="project.setup.title" message="Setup New Project" />
          </DialogTitle>
          <DialogDescription>
            <Trans
              id="project.setup.description"
              message="Navigate to a directory to set up as a Claude Code project. If CLAUDE.md exists, the project will be described. Otherwise, <0>/init</0> will be run to initialize it."
              components={{
                0: <code className="text-sm bg-muted px-1 py-0.5 rounded" />,
              }}
            />
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <DirectoryPicker onPathChange={setSelectedPath} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <Trans id="common.action.cancel" message="Cancel" />
          </Button>
          <Button
            onClick={async () => await setupProjectMutation.mutateAsync()}
            disabled={!selectedPath || setupProjectMutation.isPending}
          >
            {setupProjectMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <Trans
                  id="project.setup.action.setting_up"
                  message="Setting up..."
                />
              </>
            ) : (
              <Trans id="project.setup.action.setup" message="Setup Project" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
