export const PARKING_OPEN_MINUTE = process.env.PARKING_OPEN_MINUTE
  ? Number(process.env.PARKING_OPEN_MINUTE)
  : 0;
export const PARKING_CLOSE_MINUTE = process.env.PARKING_CLOSE_MINUTE
  ? Number(process.env.PARKING_CLOSE_MINUTE)
  : 1440;

/**
 * Parses a time string in the format "HH:MM" and returns the total number of minutes since midnight.
 */
export function parseToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Parses a date string in the format "DD/MM/YYYY" and returns a Date object in UTC.
 */
export function parseDateStr(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/');
  return new Date(
    `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`,
  );
}

/**
 * Returns the current day (at midnight UTC) and the current minute of the day.
 */
export function getCurrentDayAndMinute(): {
  today: Date;
  currentMinute: number;
} {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  return { today, currentMinute };
}

/**
 * Converts a total number of minutes since midnight into a time string in the format "HH:MM".
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}
