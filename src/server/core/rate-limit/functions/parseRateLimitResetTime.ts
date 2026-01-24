/**
 * Parses reset time text from a rate limit message and returns an ISO datetime string.
 *
 * Expected input formats:
 * - "You've hit your limit · resets 8pm (Asia/Tokyo)"
 * - "You've hit your limit · resets 3:00 AM (UTC)"
 * - "You've hit your limit · resets 8:30pm (America/New_York)"
 *
 * @param resetTimeText - The text containing the reset time information
 * @returns ISO datetime string for when the rate limit resets
 */
export const parseRateLimitResetTime = (resetTimeText: string): string => {
  // Pattern to match: "resets <time> (<timezone>)"
  // Time formats: "8pm", "8PM", "8 pm", "8:30pm", "3:00 AM", "12am", "12pm"
  const pattern =
    /resets\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)\s*\(([^)]+)\)/i;
  const match = pattern.exec(resetTimeText);

  if (!match) {
    return getFallbackTime();
  }

  const hoursStr = match[1];
  const minutesStr = match[2];
  const meridiem = match[3];
  const timezone = match[4];

  if (
    hoursStr === undefined ||
    meridiem === undefined ||
    timezone === undefined
  ) {
    return getFallbackTime();
  }

  const hours = Number.parseInt(hoursStr, 10);
  const minutes =
    minutesStr !== undefined ? Number.parseInt(minutesStr, 10) : 0;

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return getFallbackTime();
  }

  // Convert 12-hour format to 24-hour format
  const hours24 = convertTo24Hour(hours, meridiem.toLowerCase());

  // Create date in the target timezone
  const resetDate = createDateInTimezone(hours24, minutes, timezone);
  if (resetDate === null) {
    return getFallbackTime();
  }

  return resetDate.toISOString();
};

/**
 * Converts 12-hour format to 24-hour format.
 */
const convertTo24Hour = (hours: number, meridiem: string): number => {
  const isPM = meridiem === "pm";

  if (hours === 12) {
    // 12am = 0 (midnight), 12pm = 12 (noon)
    return isPM ? 12 : 0;
  }

  return isPM ? hours + 12 : hours;
};

/**
 * Calculates the UTC offset in minutes for a given timezone at a specific point in time.
 * Positive offset means timezone is ahead of UTC (e.g., +540 for JST).
 */
const getTimezoneOffsetMinutes = (timezone: string, date: Date): number => {
  // Format the same instant in both UTC and the target timezone
  const utcFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const tzFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const utcParts = utcFormatter.formatToParts(date);
  const tzParts = tzFormatter.formatToParts(date);

  const extractDateTime = (
    parts: Intl.DateTimeFormatPart[],
  ): { day: number; hour: number; minute: number } => ({
    day: Number.parseInt(parts.find((p) => p.type === "day")?.value ?? "0", 10),
    hour: Number.parseInt(
      parts.find((p) => p.type === "hour")?.value ?? "0",
      10,
    ),
    minute: Number.parseInt(
      parts.find((p) => p.type === "minute")?.value ?? "0",
      10,
    ),
  });

  const utc = extractDateTime(utcParts);
  const tz = extractDateTime(tzParts);

  // Calculate the difference in minutes
  // Handle day boundary crossing
  let dayDiff = tz.day - utc.day;
  // Normalize day difference (handle month boundaries)
  if (dayDiff > 15) dayDiff -= 31; // Crossed month boundary backwards
  if (dayDiff < -15) dayDiff += 31; // Crossed month boundary forwards

  const offsetMinutes =
    dayDiff * 24 * 60 + (tz.hour - utc.hour) * 60 + (tz.minute - utc.minute);

  return offsetMinutes;
};

/**
 * Creates a Date object for the given time in the specified timezone.
 * If the resulting time is in the past, it adjusts to the next day.
 */
const createDateInTimezone = (
  hours: number,
  minutes: number,
  timezone: string,
): Date | null => {
  const now = new Date();

  try {
    // Validate timezone by trying to use it
    const testFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });
    testFormatter.format(now); // This will throw if timezone is invalid

    // Get the timezone offset
    const offsetMinutes = getTimezoneOffsetMinutes(timezone, now);

    // Get current date in the target timezone
    const tzFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = tzFormatter.formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    if (!year || !month || !day) {
      return null;
    }

    // Calculate the UTC time for the target local time
    // If it's 8pm in Asia/Tokyo (UTC+9), UTC time would be 11am (subtract 9 hours)
    const totalTargetMinutes = hours * 60 + minutes;
    const totalUtcMinutes = totalTargetMinutes - offsetMinutes;

    // Create a date for today at midnight UTC
    const baseDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

    // Add the UTC minutes
    const resetDate = new Date(
      baseDate.getTime() + totalUtcMinutes * 60 * 1000,
    );

    // If the reset time is in the past or equal to now, add one day
    if (resetDate.getTime() <= now.getTime()) {
      resetDate.setTime(resetDate.getTime() + 24 * 60 * 60 * 1000);
    }

    return resetDate;
  } catch {
    return null;
  }
};

/**
 * Returns a fallback time (30 minutes from now) as ISO string.
 */
const getFallbackTime = (): string => {
  const fallback = new Date();
  fallback.setMinutes(fallback.getMinutes() + 30);
  return fallback.toISOString();
};
