/** Time-zone helpers using Intl only (no extra dependency). */

interface LocalParts {
  /** YYYY-MM-DD in the zone. */
  date: string;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** Minutes since local midnight. */
  minutes: number;
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** Offset of the zone from UTC at that instant, in minutes (Kigali → +120). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const p = localParts(instant, timeZone);
  const [y, m, d] = p.date.split('-').map(Number);
  const asUtc = Date.UTC(
    y,
    m - 1,
    d,
    Math.floor(p.minutes / 60),
    p.minutes % 60,
  );
  const instantMinute = Math.floor(instant.getTime() / 60_000) * 60_000;
  return Math.round((asUtc - instantMinute) / 60_000);
}

/** The UTC instant for a local date (YYYY-MM-DD) and time (HH:mm) in the zone. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  // Second pass handles days where the offset changes.
  return new Date(guess - offsetMinutes(new Date(first), timeZone) * 60_000);
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
