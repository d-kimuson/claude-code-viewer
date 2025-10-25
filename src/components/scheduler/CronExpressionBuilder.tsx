"use client";

import { Trans } from "@lingui/react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CronMode = "hourly" | "daily" | "weekly" | "custom";

interface CronExpressionBuilderProps {
  value: string;
  onChange: (expression: string) => void;
}

interface ParsedCron {
  mode: CronMode;
  hour: number;
  minute: number;
  dayOfWeek: number;
}

const WEEKDAYS = [
  {
    value: 0,
    labelKey: <Trans id="cron_builder.sunday" message="Sunday" />,
  },
  {
    value: 1,
    labelKey: <Trans id="cron_builder.monday" message="Monday" />,
  },
  {
    value: 2,
    labelKey: <Trans id="cron_builder.tuesday" message="Tuesday" />,
  },
  {
    value: 3,
    labelKey: <Trans id="cron_builder.wednesday" message="Wednesday" />,
  },
  {
    value: 4,
    labelKey: <Trans id="cron_builder.thursday" message="Thursday" />,
  },
  {
    value: 5,
    labelKey: <Trans id="cron_builder.friday" message="Friday" />,
  },
  {
    value: 6,
    labelKey: <Trans id="cron_builder.saturday" message="Saturday" />,
  },
];

function parseCronExpression(expression: string): ParsedCron | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const minute = parts[0];
  const hour = parts[1];
  const dayOfWeek = parts[4];

  if (!minute || !hour || !dayOfWeek) return null;

  // Hourly: "0 * * * *"
  if (hour === "*" && minute === "0") {
    return { mode: "hourly", hour: 0, minute: 0, dayOfWeek: 0 };
  }

  // Daily: "0 9 * * *"
  if (dayOfWeek === "*" && hour !== "*") {
    const h = Number.parseInt(hour, 10);
    const m = Number.parseInt(minute, 10);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      return { mode: "daily", hour: h, minute: m, dayOfWeek: 0 };
    }
  }

  // Weekly: "0 9 * * 1"
  if (dayOfWeek !== "*" && hour !== "*") {
    const h = Number.parseInt(hour, 10);
    const m = Number.parseInt(minute, 10);
    const dow = Number.parseInt(dayOfWeek, 10);
    if (!Number.isNaN(h) && !Number.isNaN(m) && !Number.isNaN(dow)) {
      return { mode: "weekly", hour: h, minute: m, dayOfWeek: dow };
    }
  }

  return { mode: "custom", hour: 0, minute: 0, dayOfWeek: 0 };
}

function buildCronExpression(
  mode: CronMode,
  hour: number,
  minute: number,
  dayOfWeek: number,
): string {
  switch (mode) {
    case "hourly":
      return "0 * * * *";
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly":
      return `${minute} ${hour} * * ${dayOfWeek}`;
    case "custom":
      return "0 0 * * *";
  }
}

function validateCronExpression(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const minute = parts[0];
  const hour = parts[1];
  const dayOfMonth = parts[2];
  const month = parts[3];
  const dayOfWeek = parts[4];

  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) return false;

  const isValidField = (field: string, min: number, max: number): boolean => {
    if (field === "*") return true;
    const num = Number.parseInt(field, 10);
    return !Number.isNaN(num) && num >= min && num <= max;
  };

  return (
    isValidField(minute, 0, 59) &&
    (hour === "*" || isValidField(hour, 0, 23)) &&
    (dayOfMonth === "*" || isValidField(dayOfMonth, 1, 31)) &&
    (month === "*" || isValidField(month, 1, 12)) &&
    (dayOfWeek === "*" || isValidField(dayOfWeek, 0, 6))
  );
}

function getNextExecutionPreview(expression: string): React.ReactNode {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return "Invalid cron expression";

  const minute = parts[0];
  const hour = parts[1];
  const dayOfWeek = parts[4];

  if (!minute || !hour || !dayOfWeek) return "Invalid cron expression";

  if (hour === "*") {
    return `Every hour at ${minute} minute(s)`;
  }

  const timeStr = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

  if (dayOfWeek === "*") {
    return `Every day at ${timeStr}`;
  }

  const dow = Number.parseInt(dayOfWeek, 10);
  const dayName = WEEKDAYS.find((d) => d.value === dow);
  return (
    <>
      Every {dayName ? dayName.labelKey : "unknown"} at {timeStr}
    </>
  );
}

export function CronExpressionBuilder({
  value,
  onChange,
}: CronExpressionBuilderProps) {
  const parsed = parseCronExpression(value);

  const [mode, setMode] = useState<CronMode>(parsed?.mode || "daily");
  const [hour, setHour] = useState(parsed?.hour || 9);
  const [minute, setMinute] = useState(parsed?.minute || 0);
  const [dayOfWeek, setDayOfWeek] = useState(parsed?.dayOfWeek || 1);
  const [customExpression, setCustomExpression] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "custom") {
      if (validateCronExpression(customExpression)) {
        onChange(customExpression);
        setError(null);
      } else {
        setError("Invalid cron expression");
      }
    } else {
      const expr = buildCronExpression(mode, hour, minute, dayOfWeek);
      onChange(expr);
      setCustomExpression(expr);
      setError(null);
    }
  }, [mode, hour, minute, dayOfWeek, customExpression, onChange]);

  const handleModeChange = (newMode: CronMode) => {
    setMode(newMode);
    if (newMode !== "custom") {
      const expr = buildCronExpression(newMode, hour, minute, dayOfWeek);
      setCustomExpression(expr);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          <Trans id="cron_builder.schedule_type" message="Schedule Type" />
        </Label>
        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">
              <Trans id="cron_builder.hourly" message="Hourly" />
            </SelectItem>
            <SelectItem value="daily">
              <Trans id="cron_builder.daily" message="Daily" />
            </SelectItem>
            <SelectItem value="weekly">
              <Trans id="cron_builder.weekly" message="Weekly" />
            </SelectItem>
            <SelectItem value="custom">
              <Trans id="cron_builder.custom" message="Custom" />
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "daily" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              <Trans id="cron_builder.hour" message="Hour (0-23)" />
            </Label>
            <Input
              type="number"
              min="0"
              max="23"
              value={hour}
              onChange={(e) => setHour(Number.parseInt(e.target.value, 10))}
            />
          </div>
          <div className="space-y-2">
            <Label>
              <Trans id="cron_builder.minute" message="Minute (0-59)" />
            </Label>
            <Input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(Number.parseInt(e.target.value, 10))}
            />
          </div>
        </div>
      )}

      {mode === "weekly" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              <Trans id="cron_builder.day_of_week" message="Day of Week" />
            </Label>
            <Select
              value={String(dayOfWeek)}
              onValueChange={(v) => setDayOfWeek(Number.parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>
                    {day.labelKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                <Trans id="cron_builder.hour" message="Hour (0-23)" />
              </Label>
              <Input
                type="number"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(Number.parseInt(e.target.value, 10))}
              />
            </div>
            <div className="space-y-2">
              <Label>
                <Trans id="cron_builder.minute" message="Minute (0-59)" />
              </Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minute}
                onChange={(e) => setMinute(Number.parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div className="space-y-2">
          <Label>
            <Trans
              id="cron_builder.cron_expression"
              message="Cron Expression"
            />
          </Label>
          <Input
            value={customExpression}
            onChange={(e) => setCustomExpression(e.target.value)}
            placeholder="0 9 * * *"
          />
        </div>
      )}

      <div className="rounded-md border p-3 text-sm">
        <div className="font-medium mb-1">
          <Trans id="cron_builder.preview" message="Preview" />
        </div>
        <div className="text-muted-foreground">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            getNextExecutionPreview(
              mode === "custom" ? customExpression : value,
            )
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          <Trans id="cron_builder.expression" message="Expression" />:{" "}
          <code>{mode === "custom" ? customExpression : value}</code>
        </div>
      </div>
    </div>
  );
}
