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
export const useTaskNotifications = (
  isRunningTask: boolean,
  sessionId: string,
) => {
  const settings = useAtomValue(notificationSettingsAtom);
  const soundEnabled = useAtomValue(soundNotificationsEnabledAtom);

  // Track previous running state to detect completion
  const prevIsRunningRef = useRef<boolean>(isRunningTask);
  const prevSessionIdRef = useRef<string>(sessionId);

  // Monitor task state changes
  useEffect(() => {
    const prevIsRunning = prevIsRunningRef.current;
    const currentIsRunning = isRunningTask;
    const sessionChanged = prevSessionIdRef.current !== sessionId;

    // Update refs for next comparison
    prevIsRunningRef.current = currentIsRunning;
    prevSessionIdRef.current = sessionId;

    // Detect task completion: was running, now not running.
    // Skip notification when the change is caused by switching sessions.
    if (prevIsRunning && !currentIsRunning && !sessionChanged) {
      toast.success("Task completed");

      if (soundEnabled) {
        // Play notification sound
        playNotificationSound(settings.soundType);
      }
    }
  }, [isRunningTask, sessionId, soundEnabled, settings.soundType]);
};
