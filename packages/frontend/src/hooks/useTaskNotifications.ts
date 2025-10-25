import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  notificationSettingsAtom,
  soundNotificationsEnabledAtom,
} from "@/lib/atoms/notifications";
import { playNotificationSound } from "@/lib/notifications";

/**
 * Hook to handle task completion sound notifications
 * Monitors task state changes and triggers sound when tasks complete
 */
export const useTaskNotifications = (isRunningTask: boolean) => {
  const settings = useAtomValue(notificationSettingsAtom);
  const soundEnabled = useAtomValue(soundNotificationsEnabledAtom);

  // Track previous running state to detect completion
  const prevIsRunningRef = useRef<boolean>(isRunningTask);

  // Monitor task state changes
  useEffect(() => {
    const prevIsRunning = prevIsRunningRef.current;
    const currentIsRunning = isRunningTask;

    // Update the ref for next comparison
    prevIsRunningRef.current = currentIsRunning;

    // Detect task completion: was running, now not running
    if (prevIsRunning && !currentIsRunning) {
      toast.success("Task completed");

      if (soundEnabled) {
        // Play notification sound
        playNotificationSound(settings.soundType);
      }
    }
  }, [isRunningTask, soundEnabled, settings.soundType]);
};
