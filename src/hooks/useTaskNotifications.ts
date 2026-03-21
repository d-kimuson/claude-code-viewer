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

  // Reset the running state synchronously during render when session changes.
  // This prevents a false "Task completed" notification when switching away
  // from a running session: even if isRunningTask and sessionId change across
  // separate render cycles, the ref is already up-to-date before any effect runs.
  if (prevSessionIdRef.current !== sessionId) {
    prevSessionIdRef.current = sessionId;
    prevIsRunningRef.current = isRunningTask;
  }

  // Monitor task state changes
  useEffect(() => {
    const prevIsRunning = prevIsRunningRef.current;
    prevIsRunningRef.current = isRunningTask;

    // Detect task completion: was running, now not running.
    if (prevIsRunning && !isRunningTask) {
      toast.success("Task completed");

      if (soundEnabled) {
        // Play notification sound
        playNotificationSound(settings.soundType);
      }
    }
  }, [isRunningTask, soundEnabled, settings.soundType]);
};
