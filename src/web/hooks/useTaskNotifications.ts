import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { notificationSettingsAtom, soundNotificationsEnabledAtom } from "@/lib/atoms/notifications";
import { playNotificationSound } from "@/lib/notifications";
import { abortedByUserSessionIdsAtom } from "@/web/app/projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";

/**
 * Hook to handle task completion sound notifications
 * Monitors task state changes and triggers sound when tasks complete.
 * Suppresses notifications when the task was aborted by the user.
 */
export const useTaskNotifications = (isRunningTask: boolean, sessionId: string) => {
  const settings = useAtomValue(notificationSettingsAtom);
  const soundEnabled = useAtomValue(soundNotificationsEnabledAtom);
  const abortedByUserSessionIds = useAtomValue(abortedByUserSessionIdsAtom);
  const setAbortedByUserSessionIds = useSetAtom(abortedByUserSessionIdsAtom);

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
      // Suppress toast/sound when the user explicitly aborted the task
      if (abortedByUserSessionIds.has(sessionId)) {
        // Clean up the tracked abort entry
        setAbortedByUserSessionIds((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
        return;
      }

      toast.success("Task completed");

      if (soundEnabled) {
        // Play notification sound
        playNotificationSound(settings.soundType);
      }
    }
    // Session changes are handled synchronously above (lines 27-30).
    // sessionId and abortedByUserSessionIds are included because
    // the effect needs to re-check abort tracking when session changes.
  }, [
    isRunningTask,
    soundEnabled,
    settings.soundType,
    abortedByUserSessionIds,
    sessionId,
    setAbortedByUserSessionIds,
  ]);
};
