import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  Loader2,
  PlusIcon,
} from "lucide-react";
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

const StatusIndicator: FC<{
  status: TaskStatus;
  onClick: () => void;
}> = ({ status, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-6 h-6 rounded-md shrink-0 transition-all duration-200",
        "hover:scale-110 active:scale-95",
        status === "completed" &&
          "bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30",
        status === "in_progress" &&
          "bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30",
        status === "pending" &&
          "bg-gray-500/10 text-gray-500 dark:text-gray-400 hover:bg-gray-500/20",
        status === "failed" &&
          "bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30",
      )}
    >
      {status === "completed" && <CheckCircle2 className="w-4 h-4" />}
      {status === "in_progress" && <Clock className="w-4 h-4 animate-pulse" />}
      {status === "pending" && <Circle className="w-4 h-4" />}
      {status === "failed" && <AlertCircle className="w-4 h-4" />}
    </button>
  );
};

const TaskItem: FC<{
  task: Task;
  onToggleStatus: (task: Task) => void;
}> = ({ task, onToggleStatus }) => {
  const isCompleted = task.status === "completed";
  const isInProgress = task.status === "in_progress";
  const isFailed = task.status === "failed";

  return (
    <div
      className={cn(
        "group relative block rounded-lg p-3 transition-all duration-200",
        "border border-sidebar-border/40 bg-sidebar/30",
        "hover:bg-blue-50/60 dark:hover:bg-blue-950/40",
        "hover:border-blue-300/60 dark:hover:border-blue-700/60",
        "hover:shadow-sm",
        isInProgress &&
          "bg-blue-50/80 dark:bg-blue-950/50 border-blue-400/60 dark:border-blue-600/60",
        isCompleted && "opacity-60 bg-sidebar/20",
        isFailed &&
          "border-red-400/60 bg-red-50/30 dark:bg-red-950/30 dark:border-red-700/60",
      )}
    >
      <div className="flex items-start gap-3">
        <StatusIndicator
          status={task.status}
          onClick={() => onToggleStatus(task)}
        />

        <div className="flex-1 min-w-0 space-y-1">
          {/* Title row with ID badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium leading-tight line-clamp-1",
                isCompleted && "line-through text-sidebar-foreground/60",
              )}
            >
              {task.subject}
            </span>
            <span className="text-[10px] font-mono text-sidebar-foreground/50 shrink-0">
              #{task.id}
            </span>
          </div>

          {/* Description if exists */}
          {task.description && (
            <p className="text-xs text-sidebar-foreground/60 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Blocked by badges */}
          {task.blockedBy &&
            task.blockedBy.length > 0 &&
            task.status !== "completed" && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {task.blockedBy.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                  >
                    <AlertTriangle className="w-2.5 h-2.5" />#{id}
                  </span>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

const EmptyState: FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-sidebar-accent/50 flex items-center justify-center mb-4">
        <ListTodo className="w-6 h-6 text-sidebar-foreground/40" />
      </div>
      <p className="text-sm font-medium text-sidebar-foreground/70">
        No tasks yet
      </p>
      <p className="text-xs text-sidebar-foreground/50 mt-1">
        Tasks will appear here when created
      </p>
    </div>
  );
};

const LoadingState: FC = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-2 text-sidebar-foreground/60">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading tasks...</span>
      </div>
    </div>
  );
};

const ErrorState: FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-sm font-medium text-red-600 dark:text-red-400">
        Failed to load tasks
      </p>
      <p className="text-xs text-sidebar-foreground/50 mt-1">
        Please try again later
      </p>
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
    // Cycle: pending -> in_progress -> completed -> pending
    // For failed tasks: clicking resets them to pending
    let newStatus: TaskStatus = "pending";
    if (task.status === "pending") newStatus = "in_progress";
    else if (task.status === "in_progress") newStatus = "completed";
    else if (task.status === "completed" || task.status === "failed")
      newStatus = "pending";

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

  const taskCount = tasks?.length ?? 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header - matching SessionsTab style */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">Tasks</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to track your progress.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="subject">Title</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Implement login flow"
                    className="focus-visible:ring-primary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional details about the task..."
                    className="focus-visible:ring-primary/30 min-h-[80px]"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || !subject.trim()}
                    className="w-full sm:w-auto"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Task"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xs text-sidebar-foreground/70">
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </p>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading && <LoadingState />}
        {error && <ErrorState />}
        {!isLoading && !error && taskCount === 0 && <EmptyState />}
        {!isLoading &&
          !error &&
          tasks?.map((task) => (
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
