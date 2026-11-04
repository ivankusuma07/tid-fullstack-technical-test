/**
 * All date handling goes through here.
 * - The API stores and returns UTC ISO strings.
 * - <input type="datetime-local"> values have no timezone ("2026-11-04T20:00"); they mean the
 *   browser's local time, so we convert them with `new Date(value)`, which parses that form as local.
 * - Display always uses the viewer's browser timezone.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** datetime-local value (browser local time) -> UTC ISO string for the API. */
export function toIso(localValue: string): string {
  return new Date(localValue).toISOString();
}

/** ISO string or Date -> datetime-local value in the browser's timezone. */
export function toLocalInput(value: string | Date = new Date()): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const formatter = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "04-11-2026 20:00" (dd-mm-yyyy hh:mm, like the mockup), in the viewer's timezone. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const parts = Object.fromEntries(formatter.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}`;
}

export const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
