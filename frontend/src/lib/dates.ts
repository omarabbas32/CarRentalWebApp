/**
 * Every date that crosses the wire goes through this module.
 *
 * All datetime columns are PostgreSQL `timestamptz` and Npgsql throws on a
 * `DateTime` whose `Kind` is not UTC. A local-time ISO string is not a
 * validation error — it is a 500. Pickers work in local time; conversion
 * happens here, once, on the way out.
 */

/** ISO-8601 in UTC, the only form the API accepts. */
export function toUtcIso(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("toUtcIso received an invalid Date");
  }
  return date.toISOString();
}

/**
 * Whole days between two instants, mirroring the server:
 *
 *   var totalDays = (int)(EndDate - StartDate).TotalDays;
 *   if (totalDays <= 0) totalDays = 1;
 *
 * `(int)` truncates toward zero, so a 3.9-day span bills as 3 — and any span
 * of less than a day bills as 1. Both quirks are reproduced deliberately: this
 * number drives the price the user is shown before they commit.
 */
export function daysBetween(start: Date, end: Date): number {
  const MS_PER_DAY = 86_400_000;
  const days = Math.trunc((end.getTime() - start.getTime()) / MS_PER_DAY);
  return days <= 0 ? 1 : days;
}

/** Midnight local time, N days from today. Used to pre-fill search dates. */
export function daysFromToday(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * The landing page pre-fills tomorrow → +3 days. `/api/cars/search` requires
 * both dates, so there is no date-less browse to fall back to — an empty date
 * means an empty result set, which reads as a broken site.
 */
export function defaultSearchRange(): { start: Date; end: Date } {
  return { start: daysFromToday(1), end: daysFromToday(4) };
}

/** `2026-07-31` — the form a date input expects, in local time. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateInputValue(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * `SearchFilters.Validate` rejects a range longer than this, and any range
 * where start is not strictly before end.
 */
export const MAX_SEARCH_RANGE_DAYS = 365;

export function isValidSearchRange(start: Date, end: Date): boolean {
  if (start >= end) return false;
  const spanDays = (end.getTime() - start.getTime()) / 86_400_000;
  return spanDays <= MAX_SEARCH_RANGE_DAYS;
}
