/**
 * Format duration in milliseconds to a human-readable string.
 * Examples: "1.2s", "1m 23s", "1h 5m"
 */
export const formatDuration = (durationMs: number): string => {
  if (durationMs < 0) {
    return "0s";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // For durations less than 1 minute, show seconds with one decimal
  if (hours === 0 && minutes === 0) {
    const secondsWithDecimal = durationMs / 1000;
    return `${secondsWithDecimal.toFixed(1)}s`;
  }

  // For durations 1 minute or more, show whole units
  if (hours === 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

/**
 * Calculate duration between two timestamps.
 * @param startTimestamp - ISO string timestamp (start)
 * @param endTimestamp - ISO string timestamp (end)
 * @returns Duration in milliseconds, or null if invalid timestamps
 */
export const calculateDuration = (
  startTimestamp: string,
  endTimestamp: string,
): number | null => {
  const startDate = new Date(startTimestamp);
  const endDate = new Date(endTimestamp);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return endDate.getTime() - startDate.getTime();
};
