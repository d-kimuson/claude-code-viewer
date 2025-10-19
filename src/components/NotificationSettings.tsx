"use client";

import { Trans } from "@lingui/react";
import { useAtom } from "jotai";
import { type FC, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type NotificationSoundType,
  notificationSettingsAtom,
} from "@/lib/atoms/notifications";
import {
  getAvailableSoundTypes,
  getSoundDisplayName,
  playNotificationSound,
} from "@/lib/notifications";

interface NotificationSettingsProps {
  showLabels?: boolean;
  showDescriptions?: boolean;
  className?: string;
}

export const NotificationSettings: FC<NotificationSettingsProps> = ({
  showLabels = true,
  showDescriptions = true,
  className = "",
}: NotificationSettingsProps) => {
  const selectId = useId();
  const [settings, setSettings] = useAtom(notificationSettingsAtom);

  const handleSoundTypeChange = useCallback(
    (value: NotificationSoundType) => {
      setSettings((prev) => ({
        ...prev,
        soundType: value,
      }));
    },
    [setSettings],
  );

  const handleTestSound = useCallback(() => {
    if (settings.soundType !== "none") {
      playNotificationSound(settings.soundType);
    }
  }, [settings.soundType]);

  const availableSoundTypes = getAvailableSoundTypes();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        {showLabels && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium leading-none"
          >
            Task completion sound
          </label>
        )}

        <div className="flex items-center gap-2">
          <Select
            value={settings.soundType}
            onValueChange={handleSoundTypeChange}
          >
            <SelectTrigger id={selectId} className="w-[180px]">
              <SelectValue placeholder="音を選択" />
            </SelectTrigger>
            <SelectContent>
              {availableSoundTypes.map((soundType) => (
                <SelectItem key={soundType} value={soundType}>
                  {getSoundDisplayName(soundType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {settings.soundType !== "none" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSound}
              className="px-3"
            >
              <Trans id="notification.test" message="Test" />
            </Button>
          )}
        </div>

        {showDescriptions && (
          <p className="text-xs text-muted-foreground">
            <Trans
              id="notification.description"
              message="Select a sound to play when a task completes"
            />
          </p>
        )}
      </div>
    </div>
  );
};
