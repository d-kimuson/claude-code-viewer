"use client";

import { Trans, useLingui } from "@lingui/react";
import { type FC, useCallback, useEffect, useState } from "react";
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
import type {
  NewSchedulerJob,
  SchedulerJob,
} from "@/server/core/scheduler/schema";
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

type DelayUnit = "minutes" | "hours" | "days";

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
  const [scheduleType, setScheduleType] = useState<"cron" | "fixed">("cron");
  const [cronExpression, setCronExpression] = useState("0 9 * * *");
  const [delayValue, setDelayValue] = useState(60); // 60 minutes default
  const [delayUnit, setDelayUnit] = useState<DelayUnit>("minutes");
  const [messageContent, setMessageContent] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [concurrencyPolicy, setConcurrencyPolicy] = useState<"skip" | "run">(
    "skip",
  );

  // Message completion hook
  const completion = useMessageCompletion();

  // Convert delay value and unit to milliseconds
  const delayToMs = useCallback((value: number, unit: DelayUnit): number => {
    switch (unit) {
      case "minutes":
        return value * 60 * 1000;
      case "hours":
        return value * 60 * 60 * 1000;
      case "days":
        return value * 24 * 60 * 60 * 1000;
    }
  }, []);

  // Convert milliseconds to delay value and unit
  const msToDelay = useCallback(
    (ms: number): { value: number; unit: DelayUnit } => {
      const minutes = ms / (60 * 1000);
      const hours = ms / (60 * 60 * 1000);
      const days = ms / (24 * 60 * 60 * 1000);

      if (days >= 1 && days === Math.floor(days)) {
        return { value: days, unit: "days" };
      }
      if (hours >= 1 && hours === Math.floor(hours)) {
        return { value: hours, unit: "hours" };
      }
      return { value: minutes, unit: "minutes" };
    },
    [],
  );

  // Initialize form with job data when editing
  useEffect(() => {
    if (job) {
      setName(job.name);
      setScheduleType(job.schedule.type);
      if (job.schedule.type === "cron") {
        setCronExpression(job.schedule.expression);
      } else {
        const { value, unit } = msToDelay(job.schedule.delayMs);
        setDelayValue(value);
        setDelayUnit(unit);
      }
      setMessageContent(job.message.content);
      setEnabled(job.enabled);
      setConcurrencyPolicy(job.concurrencyPolicy);
    } else {
      // Reset form for new job
      setName("");
      setScheduleType("cron");
      setCronExpression("0 9 * * *");
      setDelayValue(60);
      setDelayUnit("minutes");
      setMessageContent("");
      setEnabled(true);
      setConcurrencyPolicy("skip");
    }
  }, [job, msToDelay]);

  const handleSubmit = () => {
    const delayMs = delayToMs(delayValue, delayUnit);
    const newJob: NewSchedulerJob = {
      name,
      schedule:
        scheduleType === "cron"
          ? { type: "cron", expression: cronExpression }
          : { type: "fixed", delayMs, oneTime: true },
      message: {
        content: messageContent,
        projectId,
        baseSessionId: null,
      },
      enabled,
      concurrencyPolicy,
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
              onValueChange={(value: "cron" | "fixed") =>
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
                <SelectItem value="fixed">
                  <Trans
                    id="scheduler.form.schedule_type.fixed"
                    message="遅延実行"
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
              <Label>
                <Trans id="scheduler.form.delay" message="遅延時間" />
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={delayValue}
                  onChange={(e) =>
                    setDelayValue(Number.parseInt(e.target.value, 10))
                  }
                  disabled={isSubmitting}
                  className="flex-1"
                  placeholder="60"
                />
                <Select
                  value={delayUnit}
                  onValueChange={(value: DelayUnit) => setDelayUnit(value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">
                      <Trans
                        id="scheduler.form.delay_unit.minutes"
                        message="分"
                      />
                    </SelectItem>
                    <SelectItem value="hours">
                      <Trans
                        id="scheduler.form.delay_unit.hours"
                        message="時間"
                      />
                    </SelectItem>
                    <SelectItem value="days">
                      <Trans id="scheduler.form.delay_unit.days" message="日" />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                <Trans
                  id="scheduler.form.delay.hint"
                  message="指定した遅延時間後に一度だけ実行されます"
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

          {/* Concurrency Policy */}
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
