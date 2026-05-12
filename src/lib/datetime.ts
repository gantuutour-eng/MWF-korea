// All event/payment timestamps in the app are interpreted and displayed in
// Asia/Seoul. The Cloudflare Workers runtime is UTC, so a naive
// `new Date(unix * 1000).getHours()` returns UTC hours — that gave admins a
// confusing "I typed 1:00, the site shows 16:00" bug. These helpers route
// every read and write through a single canonical timezone so the same wall
// clock is shown to every viewer regardless of where the server (or the
// admin's browser) actually is.

export const APP_TZ = "Asia/Seoul";

/** "2026.05.17" in Seoul time. */
export function formatDate(unix: number): string {
  const parts = ymdhmParts(unix);
  return `${parts.y}.${parts.m}.${parts.d}`;
}

/** "01:00" in Seoul time. */
export function formatTime(unix: number): string {
  const parts = ymdhmParts(unix);
  return `${parts.hh}:${parts.mm}`;
}

/** "2026.05.17 01:00" in Seoul time. */
export function formatDateTime(unix: number): string {
  const parts = ymdhmParts(unix);
  return `${parts.y}.${parts.m}.${parts.d} ${parts.hh}:${parts.mm}`;
}

/** "2026-05-17T01:00" — usable as the `value` of an <input type="datetime-local">. */
export function toDateTimeLocalValue(unix: number): string {
  const p = ymdhmParts(unix);
  return `${p.y}-${p.m}-${p.d}T${p.hh}:${p.mm}`;
}

/**
 * Parse "2026-05-17T01:00" as if it were entered in Asia/Seoul (regardless
 * of where the admin's browser actually is) and return unix seconds.
 * Returns NaN on malformed input.
 */
export function fromDateTimeLocalValue(value: string): number {
  if (!value) return NaN;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return NaN;
  const [, y, mo, d, h, mi] = m;
  return wallClockSeoulToUnix(+y, +mo, +d, +h, +mi);
}

/** Year/month/day (1-based) and hour/minute in Seoul as strings. */
function ymdhmParts(unix: number): {
  y: string;
  m: string;
  d: string;
  hh: string;
  mm: string;
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const pieces = Object.fromEntries(
    fmt.formatToParts(new Date(unix * 1000)).map((p) => [p.type, p.value]),
  );
  // Intl can emit "24" for midnight on some engines — normalize.
  const hh = pieces.hour === "24" ? "00" : pieces.hour ?? "00";
  return {
    y: pieces.year ?? "1970",
    m: pieces.month ?? "01",
    d: pieces.day ?? "01",
    hh,
    mm: pieces.minute ?? "00",
  };
}

/** Numeric Y/M/D for the given unix in Seoul (1-based month, 1-based day). */
export function getYMD(unix: number): { y: number; m: number; d: number } {
  const p = ymdhmParts(unix);
  return { y: +p.y, m: +p.m, d: +p.d };
}

/** Weekday in Seoul time: 0=Sun, 1=Mon, ..., 6=Sat. */
export function getWeekday(unix: number): number {
  // Use Intl with the `weekday: short` then map back to indices — robust
  // across runtimes even though it's a bit silly.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TZ,
    weekday: "short",
  });
  const wd = fmt.format(new Date(unix * 1000));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}

/** "today" in Seoul as { y, m, d } 1-based. */
export function todaySeoul(): { y: number; m: number; d: number } {
  return getYMD(Math.floor(Date.now() / 1000));
}

/**
 * Convert a Seoul wall-clock moment to a unix timestamp by computing the
 * exact offset Asia/Seoul had at that moment. (Seoul is currently UTC+9
 * year-round, but the lookup handles future TZ-database changes too.)
 */
export function wallClockSeoulToUnix(
  y: number,
  m: number,
  d: number,
  h: number,
  mi: number,
): number {
  // Start with the naive UTC interpretation of the wall clock.
  let guess = Date.UTC(y, m - 1, d, h, mi);
  // Find what wall clock that guess actually is in Seoul.
  const seoul = ymdhmParts(Math.floor(guess / 1000));
  const seoulMs = Date.UTC(+seoul.y, +seoul.m - 1, +seoul.d, +seoul.hh, +seoul.mm);
  const offsetMs = seoulMs - guess; // Seoul - UTC
  return Math.floor((guess - offsetMs) / 1000);
}

/** "YYYY-MM-DD" in Seoul time for a unix value. */
export function toIsoDate(unix: number): string {
  const p = getYMD(unix);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/**
 * For the given Seoul calendar day, return the [start, endExclusive) unix
 * range covering that day. Useful for "all events happening on date X".
 */
export function dayRangeUnix(
  y: number,
  m: number,
  d: number,
): { start: number; endExclusive: number } {
  const start = wallClockSeoulToUnix(y, m, d, 0, 0);
  // Add 24h — works across DST/offset changes for our use case.
  const endExclusive = start + 24 * 3600;
  return { start, endExclusive };
}
