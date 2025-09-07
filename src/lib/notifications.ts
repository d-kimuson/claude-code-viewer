/**
 * Audio notification utilities for task completion alerts
 */

import type { NotificationSoundType } from "./atoms/notifications";

/**
 * Sound configuration for different notification types
 */
const soundConfigs: Record<
  Exclude<NotificationSoundType, "none">,
  {
    frequency: number[];
    duration: number;
    type: OscillatorType;
    volume: number;
  }
> = {
  beep: {
    frequency: [800],
    duration: 0.15,
    type: "sine",
    volume: 0.3,
  },
  chime: {
    frequency: [523, 659, 784], // C, E, G notes
    duration: 0.4,
    type: "sine",
    volume: 0.2,
  },
  ping: {
    frequency: [1000],
    duration: 0.1,
    type: "triangle",
    volume: 0.4,
  },
  pop: {
    frequency: [400, 600],
    duration: 0.08,
    type: "square",
    volume: 0.2,
  },
};

/**
 * Play a notification sound based on the sound type
 */
export function playNotificationSound(soundType: NotificationSoundType) {
  if (soundType === "none") {
    return;
  }

  try {
    const config = soundConfigs[soundType];
    if (!config) {
      console.warn(`Unknown sound type: ${soundType}`);
      return;
    }

    const audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();

    // Play multiple frequencies if specified (for chords/sequences)
    config.frequency.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.type = config.type;

      // Set volume and fade out
      const startTime = audioContext.currentTime + index * 0.05; // Slight delay for sequences
      gainNode.gain.setValueAtTime(config.volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        startTime + config.duration,
      );

      // Play the sound
      oscillator.start(startTime);
      oscillator.stop(startTime + config.duration);
    });
  } catch (error) {
    console.warn("Failed to play notification sound:", error);
  }
}

/**
 * Get display name for sound types
 */
export function getSoundDisplayName(soundType: NotificationSoundType): string {
  const displayNames: Record<NotificationSoundType, string> = {
    none: "なし",
    beep: "ビープ",
    chime: "チャイム",
    ping: "ピン",
    pop: "ポップ",
  };

  return displayNames[soundType];
}

/**
 * Get all available sound types
 */
export function getAvailableSoundTypes(): NotificationSoundType[] {
  return ["none", "beep", "chime", "ping", "pop"];
}
