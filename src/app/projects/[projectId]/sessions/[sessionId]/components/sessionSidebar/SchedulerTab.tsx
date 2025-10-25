"use client";

import { Trans, useLingui } from "@lingui/react";
import { EditIcon, PlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { type FC, useState } from "react";
import { toast } from "sonner";
import { SchedulerJobDialog } from "@/components/scheduler/SchedulerJobDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type NewSchedulerJob,
  type SchedulerJob,
  useCreateSchedulerJob,
  useDeleteSchedulerJob,
  useSchedulerJobs,
  useUpdateSchedulerJob,
} from "@/hooks/useScheduler";

export const SchedulerTab: FC<{ projectId: string; sessionId: string }> = ({
  projectId,
  sessionId,
}) => {
  const { i18n } = useLingui();
  const { data: jobs, isLoading, error, refetch } = useSchedulerJobs();
  const createJob = useCreateSchedulerJob();
  const updateJob = useUpdateSchedulerJob();
  const deleteJob = useDeleteSchedulerJob();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<SchedulerJob | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const handleCreateJob = (job: NewSchedulerJob) => {
    createJob.mutate(job, {
      onSuccess: () => {
        toast.success(
          i18n._({
            id: "scheduler.job.created",
            message: "Job created successfully",
          }),
        );
        setDialogOpen(false);
      },
      onError: (error) => {
        toast.error(
          i18n._({
            id: "scheduler.job.create_failed",
            message: "Failed to create job",
          }),
          {
            description: error.message,
          },
        );
      },
    });
  };

  const handleUpdateJob = (job: NewSchedulerJob) => {
    if (!editingJob) return;

    updateJob.mutate(
      {
        id: editingJob.id,
        updates: job,
      },
      {
        onSuccess: () => {
          toast.success(
            i18n._({
              id: "scheduler.job.updated",
              message: "Job updated successfully",
            }),
          );
          setDialogOpen(false);
          setEditingJob(null);
        },
        onError: (error) => {
          toast.error(
            i18n._({
              id: "scheduler.job.update_failed",
              message: "Failed to update job",
            }),
            {
              description: error.message,
            },
          );
        },
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deletingJobId) return;

    deleteJob.mutate(deletingJobId, {
      onSuccess: () => {
        toast.success(
          i18n._({
            id: "scheduler.job.deleted",
            message: "Job deleted successfully",
          }),
        );
        setDeleteDialogOpen(false);
        setDeletingJobId(null);
      },
      onError: (error) => {
        toast.error(
          i18n._({
            id: "scheduler.job.delete_failed",
            message: "Failed to delete job",
          }),
          {
            description: error.message,
          },
        );
      },
    });
  };

  const handleEditClick = (job: SchedulerJob) => {
    setEditingJob(job);
    setDialogOpen(true);
  };

  const handleDeleteClick = (jobId: string) => {
    setDeletingJobId(jobId);
    setDeleteDialogOpen(true);
  };

  const formatSchedule = (job: SchedulerJob) => {
    if (job.schedule.type === "cron") {
      return `Cron: ${job.schedule.expression}`;
    }
    const hours = Math.floor(job.schedule.delayMs / 3600000);
    const minutes = Math.floor((job.schedule.delayMs % 3600000) / 60000);
    const timeStr =
      hours > 0
        ? `${hours}h ${minutes}m`
        : minutes > 0
          ? `${minutes}m`
          : `${job.schedule.delayMs}ms`;
    return `${job.schedule.oneTime ? "Once" : "Recurring"}: ${timeStr}`;
  };

  const formatLastRun = (lastRunAt: string | null) => {
    if (!lastRunAt) return "Never";
    const date = new Date(lastRunAt);
    return date.toLocaleString();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-sidebar-foreground">
            <Trans id="scheduler.title" message="Scheduler" />
          </h2>
          <div className="flex gap-1">
            <Button
              onClick={() => refetch()}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={isLoading}
              title={i18n._({ id: "common.reload", message: "Reload" })}
            >
              <RefreshCwIcon
                className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              onClick={() => {
                setEditingJob(null);
                setDialogOpen(true);
              }}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title={i18n._({
                id: "scheduler.create_job",
                message: "Create Job",
              })}
            >
              <PlusIcon className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">
              <Trans id="common.loading" message="Loading..." />
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500">
            <Trans
              id="scheduler.error.load_failed"
              message="Failed to load scheduler jobs: {error}"
              values={{ error: error.message }}
            />
          </div>
        )}

        {jobs && jobs.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            <Trans
              id="scheduler.no_jobs"
              message="No scheduled jobs. Click + to create one."
            />
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-3 bg-sidebar-accent/50 rounded-md border border-sidebar-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-sidebar-foreground truncate">
                        {job.name}
                      </h3>
                      <Badge
                        variant={job.enabled ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {job.enabled ? (
                          <Trans
                            id="scheduler.status.enabled"
                            message="Enabled"
                          />
                        ) : (
                          <Trans
                            id="scheduler.status.disabled"
                            message="Disabled"
                          />
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatSchedule(job)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleEditClick(job)}
                    >
                      <EditIcon className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(job.id)}
                    >
                      <TrashIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {job.lastRunAt && (
                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-sidebar-border">
                    <div className="flex items-center justify-between">
                      <span>
                        <Trans id="scheduler.last_run" message="Last run: " />
                        <span>{formatLastRun(job.lastRunAt)}</span>
                      </span>
                      {job.lastRunStatus && (
                        <Badge
                          variant={
                            job.lastRunStatus === "success"
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {job.lastRunStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <SchedulerJobDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingJob(null);
        }}
        job={editingJob}
        projectId={projectId}
        currentSessionId={sessionId}
        onSubmit={editingJob ? handleUpdateJob : handleCreateJob}
        isSubmitting={createJob.isPending || updateJob.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans id="scheduler.delete_dialog.title" message="Delete Job" />
            </DialogTitle>
            <DialogDescription>
              <Trans
                id="scheduler.delete_dialog.description"
                message="Are you sure you want to delete this job? This action cannot be undone."
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingJobId(null);
              }}
              disabled={deleteJob.isPending}
            >
              <Trans id="common.cancel" message="Cancel" />
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteJob.isPending}
            >
              {deleteJob.isPending ? (
                <Trans id="common.deleting" message="Deleting..." />
              ) : (
                <Trans id="common.delete" message="Delete" />
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
