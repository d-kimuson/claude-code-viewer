import { Trans } from "@lingui/react";
import { useAtom } from "jotai";
import { BellIcon, BellOffIcon, BellRingIcon } from "lucide-react";
import { type FC, useCallback, useId, useState } from "react";
import { type NotificationSoundType, notificationSettingsAtom } from "@/lib/atoms/notifications";
import {
  getAvailableSoundTypes,
  getSoundDisplayName,
  playNotificationSound,
} from "@/lib/notifications";
import { requestPushPermissionAndSubscribe } from "@/lib/push/usePushSubscription";
import { Button } from "@/web/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/web/components/ui/select";

type NotificationSettingsProps = {
  showLabels?: boolean;
  showDescriptions?: boolean;
  className?: string;
};

const isPushSupported = (): boolean =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const getInitialPermission = (): NotificationPermission | "unsupported" => {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
};

export const NotificationSettings: FC<NotificationSettingsProps> = ({
  showLabels = true,
  showDescriptions = true,
  className = "",
}: NotificationSettingsProps) => {
  const selectId = useId();
  const [settings, setSettings] = useAtom(notificationSettingsAtom);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    getInitialPermission,
  );
  const [isSubscribing, setIsSubscribing] = useState(false);

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

  const handleEnablePush = useCallback(() => {
    setIsSubscribing(true);
    void requestPushPermissionAndSubscribe()
      .then((permission) => {
        setPushPermission(permission);
      })
      .finally(() => {
        setIsSubscribing(false);
      });
  }, []);

  const availableSoundTypes = getAvailableSoundTypes();

  return (
    <div className={`space-y-4 ${className}`}>
      {pushPermission !== "unsupported" && (
        <div className="space-y-2">
          {showLabels && (
            <p className="text-sm font-medium leading-none">
              <Trans id="notification.push.label" />
            </p>
          )}

          <div className="flex items-center gap-2">
            {pushPermission === "granted" ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <BellRingIcon className="w-3.5 h-3.5 text-primary" />
                <span>
                  <Trans id="notification.push.enabled" />
                </span>
              </div>
            ) : pushPermission === "denied" ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <BellOffIcon className="w-3.5 h-3.5" />
                <span>
                  <Trans id="notification.push.denied" />
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="gap-1.5"
              >
                <BellIcon className="w-3.5 h-3.5" />
                <Trans id="notification.push.enable" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {showLabels && (
          <label htmlFor={selectId} className="text-sm font-medium leading-none">
            Task completion sound
          </label>
        )}

        <div className="flex items-center gap-2">
          <Select value={settings.soundType} onValueChange={handleSoundTypeChange}>
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
            <Button variant="outline" size="sm" onClick={handleTestSound} className="px-3">
              <Trans id="notification.test" />
            </Button>
          )}
        </div>

        {showDescriptions && (
          <p className="text-xs text-muted-foreground">
            <Trans id="notification.description" />
          </p>
        )}
      </div>
    </div>
  );
};
