"use client";

import { Trans } from "@lingui/react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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

export const CreateProjectDialog: FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const router = useRouter();

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await honoClient.api.projects.$post({
        json: { projectPath: selectedPath },
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      return await response.json();
    },

    onSuccess: (result) => {
      toast.success("Project created successfully");
      setOpen(false);
      router.push(`/projects/${result.projectId}/sessions/${result.sessionId}`);
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create project",
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
            <Trans id="project.create.title" message="Create New Project" />
          </DialogTitle>
          <DialogDescription>
            <Trans
              id="project.create.description"
              message="Select a directory to initialize as a Claude Code project. This will run <0>/init</0> in the selected directory."
              components={{
                0: <code className="text-sm bg-muted px-1 py-0.5 rounded" />,
              }}
            />
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <DirectoryPicker
            selectedPath={selectedPath}
            onPathChange={setSelectedPath}
          />
          {selectedPath ? (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">
                <Trans
                  id="project.create.selected_directory"
                  message="Selected directory:"
                />
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                {selectedPath}
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <Trans id="common.action.cancel" message="Cancel" />
          </Button>
          <Button
            onClick={async () => await createProjectMutation.mutateAsync()}
            disabled={!selectedPath || createProjectMutation.isPending}
          >
            {createProjectMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <Trans
                  id="project.create.action.creating"
                  message="Creating..."
                />
              </>
            ) : (
              <Trans
                id="project.create.action.create"
                message="Create Project"
              />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
