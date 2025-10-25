"use client";

import type {
  NewSchedulerJob,
  SchedulerJob,
} from "@claude-code-viewer/backend/types";
import { Trans, useLingui } from "@lingui/react";
import { type FC, useEffect, useState } from "react";
import { InlineCompletion } from "@/app/projects/[projectId]/components/chatForm/InlineCompletion";
import { useMessageCompletion } from "@/app/projects/[projectId]/components/chatForm/useMessageCompletion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CronExpressionBuilder } from "./CronExpressionBuilder";

export interface SchedulerJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: SchedulerJob | null;
  projectId: string;
  currentSessionId: string;
  onSubmit: (job: NewSchedulerJob) => void;
  isSubmitting?: boolean;
}

export const SchedulerJobDialog: FC<SchedulerJobDialogProps> = ({
  open,
  onOpenChange,
  job,
  projectId,
  onSubmit,
  isSubmitting = false,
}) => {
  const { _, i18n } = useLingui();

  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] = useState<"cron" | "reserved">("cron");
  const [cronExpression, setCronExpression] = useState("0 9 * * *");
  const [reservedDateTime, setReservedDateTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  });
  const [messageContent, setMessageContent] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [concurrencyPolicy, setConcurrencyPolicy] = useState<"skip" | "run">(
    "skip",
  );

  // Message completion hook
  const completion = useMessageCompletion();

  // Initialize form with job data when editing
  useEffect(() => {
    if (job) {
      setName(job.name);
      setScheduleType(job.schedule.type);
      if (job.schedule.type === "cron") {
        setCronExpression(job.schedule.expression);
        setConcurrencyPolicy(job.schedule.concurrencyPolicy);
      } else if (job.schedule.type === "reserved") {
        // Convert UTC time to local time for display
        const date = new Date(job.schedule.reservedExecutionTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        setReservedDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
      setMessageContent(job.message.content);
      setEnabled(job.enabled);
    } else {
      // Reset form for new job
      setName("");
      setScheduleType("cron");
      setCronExpression("0 9 * * *");
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setReservedDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      setMessageContent("");
      setEnabled(true);
      setConcurrencyPolicy("skip");
    }
  }, [job]);

  const handleSubmit = () => {
    const newJob: NewSchedulerJob = {
      name,
      schedule:
        scheduleType === "cron"
          ? {
              type: "cron",
              expression: cronExpression,
              concurrencyPolicy,
            }
          : {
              type: "reserved",
              // datetime-local returns "YYYY-MM-DDTHH:mm" in local time
              // We need to treat this as local time and convert to UTC
              reservedExecutionTime: (() => {
                // datetime-local format: "YYYY-MM-DDTHH:mm"
                // Parse as local time and convert to ISO string (UTC)
                const match = reservedDateTime.match(
                  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
                );
                if (!match) {
                  throw new Error("Invalid datetime format");
                }
                const year = Number(match[1]);
                const month = Number(match[2]);
                const day = Number(match[3]);
                const hours = Number(match[4]);
                const minutes = Number(match[5]);
                const localDate = new Date(
                  year,
                  month - 1,
                  day,
                  hours,
                  minutes,
                );
                return localDate.toISOString();
              })(),
            },
      message: {
        content: messageContent,
        projectId,
        baseSessionId: null,
      },
      enabled,
    };

    onSubmit(newJob);
  };

  const isFormValid = name.trim() !== "" && messageContent.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {job ? (
              <Trans
                id="scheduler.dialog.title.edit"
                message="スケジュールジョブを編集"
              />
            ) : (
              <Trans
                id="scheduler.dialog.title.create"
                message="スケジュールジョブを作成"
              />
            )}
          </DialogTitle>
          <DialogDescription>
            <Trans
              id="scheduler.dialog.description"
              message="Claude Code にメッセージを送信するスケジュールジョブを設定します"
            />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="text-base font-semibold">
                <Trans id="scheduler.form.enabled" message="有効化" />
              </Label>
              <p className="text-sm text-muted-foreground">
                <Trans
                  id="scheduler.form.enabled.description"
                  message="このスケジュールジョブを有効または無効にします"
                />
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isSubmitting}
            />
          </div>

          {/* Job Name */}
          <div className="space-y-2">
            <Label htmlFor="job-name">
              <Trans id="scheduler.form.name" message="ジョブ名" />
            </Label>
            <Input
              id="job-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={_({
                id: "scheduler.form.name.placeholder",
                message: "例: 日次レポート",
              })}
              disabled={isSubmitting}
            />
          </div>

          {/* Schedule Type */}
          <div className="space-y-2">
            <Label>
              <Trans
                id="scheduler.form.schedule_type"
                message="スケジュールタイプ"
              />
            </Label>
            <Select
              value={scheduleType}
              onValueChange={(value: "cron" | "reserved") =>
                setScheduleType(value)
              }
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cron">
                  <Trans
                    id="scheduler.form.schedule_type.cron"
                    message="定期実行 (Cron)"
                  />
                </SelectItem>
                <SelectItem value="reserved">
                  <Trans
                    id="scheduler.form.schedule_type.reserved"
                    message="予約実行"
                  />
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Configuration */}
          {scheduleType === "cron" ? (
            <CronExpressionBuilder
              value={cronExpression}
              onChange={setCronExpression}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="reserved-datetime">
                <Trans
                  id="scheduler.form.reserved_time"
                  message="実行予定日時"
                />
              </Label>
              <Input
                id="reserved-datetime"
                type="datetime-local"
                value={reservedDateTime}
                onChange={(e) => setReservedDateTime(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                <Trans
                  id="scheduler.form.reserved_time.hint"
                  message="指定した日時に一度だけ実行されます。実行後は自動的に削除されます"
                />
              </p>
            </div>
          )}

          {/* Message Content */}
          <div className="space-y-2">
            <Label htmlFor="message-content">
              <Trans id="scheduler.form.message" message="メッセージ内容" />
            </Label>
            <div className="relative" ref={completion.containerRef}>
              <Textarea
                ref={completion.textareaRef}
                id="message-content"
                value={messageContent}
                onChange={(e) =>
                  completion.handleChange(e.target.value, setMessageContent)
                }
                onKeyDown={(e) => completion.handleKeyDown(e)}
                placeholder={i18n._({
                  id: "scheduler.form.message.placeholder",
                  message:
                    "Claude Code に送信するメッセージを入力... (/ でコマンド補完、@ でファイル補完)",
                })}
                rows={4}
                disabled={isSubmitting}
                className="resize-none"
                aria-label={i18n._(
                  "Message input with completion support (/ for commands, @ for files)",
                )}
                aria-expanded={
                  messageContent.startsWith("/") || messageContent.includes("@")
                }
                aria-haspopup="listbox"
                role="combobox"
                aria-autocomplete="list"
              />
              <InlineCompletion
                projectId={projectId}
                message={messageContent}
                commandCompletionRef={completion.commandCompletionRef}
                fileCompletionRef={completion.fileCompletionRef}
                handleCommandSelect={(cmd) =>
                  completion.handleCommandSelect(cmd, setMessageContent)
                }
                handleFileSelect={(file) =>
                  completion.handleFileSelect(file, setMessageContent)
                }
                cursorPosition={completion.cursorPosition}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              <Trans
                id="scheduler.form.message.hint"
                message="/ でコマンド補完、@ でファイル補完"
              />
            </p>
          </div>

          {/* Concurrency Policy (only for cron schedules) */}
          {scheduleType === "cron" && (
            <div className="space-y-2">
              <Label>
                <Trans
                  id="scheduler.form.concurrency_policy"
                  message="同時実行ポリシー"
                />
              </Label>
              <Select
                value={concurrencyPolicy}
                onValueChange={(value: "skip" | "run") =>
                  setConcurrencyPolicy(value)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">
                    <Trans
                      id="scheduler.form.concurrency_policy.skip"
                      message="実行中の場合はスキップ"
                    />
                  </SelectItem>
                  <SelectItem value="run">
                    <Trans
                      id="scheduler.form.concurrency_policy.run"
                      message="実行中でも実行する"
                    />
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            <Trans id="common.cancel" message="キャンセル" />
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <Trans id="common.saving" message="保存中..." />
            ) : job ? (
              <Trans id="common.update" message="更新" />
            ) : (
              <Trans id="common.create" message="作成" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
