import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, PlusIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTask, listTasks, updateTask } from "@/lib/api/tasks";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus, TaskUpdate } from "@/server/core/tasks/schema";

interface TasksTabProps {
  projectId: string;
  sessionId?: string;
}

const TaskItem: FC<{
  task: Task;
  onToggleStatus: (task: Task) => void;
}> = ({ task, onToggleStatus }) => {
  const isCompleted = task.status === "completed";
  // ... rest of TaskItem remains same until we reach handleToggleStatus logic ...

  const isInProgress = task.status === "in_progress";
  const isFailed = task.status === "failed";

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border bg-card flex flex-col gap-2 transition-all",
        isCompleted && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleStatus(task)}
          className={cn(
            "mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
            isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : isInProgress
                ? "border-blue-500 text-blue-500"
                : isFailed
                  ? "border-red-500 text-red-500"
                  : "border-muted-foreground text-transparent hover:border-primary",
          )}
        >
          {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
          {isInProgress && <Clock className="w-3.5 h-3.5" />}
          {isFailed && <AlertCircle className="w-3.5 h-3.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium text-sm",
                isCompleted && "line-through text-muted-foreground",
              )}
            >
              {task.subject}
            </span>
            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
              #{task.id}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          {task.status !== "completed" &&
            task.blockedBy &&
            task.blockedBy.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {task.blockedBy.map((blockerId) => (
                  <span
                    key={blockerId}
                    className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px] text-muted-foreground border border-border"
                  >
                    Blocked by #{blockerId}
                  </span>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export const TasksTab: FC<TasksTabProps> = ({ projectId, sessionId }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const queryClient = useQueryClient();

  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tasks", projectId, sessionId],
    queryFn: () => listTasks(projectId, sessionId),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (data: { subject: string; description?: string }) =>
      createTask(projectId, data, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", projectId, sessionId],
      });
      setIsCreateOpen(false);
      setSubject("");
      setDescription("");
      toast.success("Task created");
    },
    onError: () => toast.error("Failed to create task"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { taskId: string; update: Partial<TaskUpdate> }) =>
      updateTask(projectId, data.taskId, data.update, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", projectId, sessionId],
      });
    },
    onError: () => toast.error("Failed to update task"),
  });

  const handleToggleStatus = (task: Task) => {
    // If pending -> in_progress -> completed. But for simple toggle lets just complete.
    // Or if currently pending, move to in_progress, if in_progress move to completed.
    // If pending -> in_progress -> completed. But for simple toggle lets just complete.
    // Or if currently pending, move to in_progress, if in_progress move to completed.
    let newStatus: TaskStatus = "pending";
    if (task.status === "pending") newStatus = "in_progress";
    else if (task.status === "in_progress") newStatus = "completed";
    else if (task.status === "completed") newStatus = "pending";

    updateMutation.mutate({
      taskId: task.id,
      update: { status: newStatus },
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    createMutation.mutate({ subject, description });
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading tasks...</div>
    );
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">Error loading tasks</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">Tasks</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <PlusIcon className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Add a new task to track.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Title</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Implement login"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details..."
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks?.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No tasks found.
          </div>
        )}
        {tasks?.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleStatus={handleToggleStatus}
          />
        ))}
      </div>
    </div>
  );
};
