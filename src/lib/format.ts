const LOCALE = 'en-GB';

const dayFmt = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat(LOCALE, { month: 'short' });
const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** For date-only values such as "2026-09-18" (kept in UTC so the day never shifts). */
export const fmtDay = (isoDate: string): string => dayFmt.format(new Date(isoDate));
export const fmtMonth = (iso: string): string => monthFmt.format(new Date(iso));
export const fmtTime = (iso: string): string => timeFmt.format(new Date(iso));
export const fmtDateTime = (iso: string): string => dateTimeFmt.format(new Date(iso));

const relativeFmt = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** "5 minutes ago", switching to a plain date after a month. */
export function fmtRelative(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'just now';
  if (abs < 3600) return relativeFmt.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return relativeFmt.format(Math.round(seconds / 3600), 'hour');
  if (abs < 2_592_000) return relativeFmt.format(Math.round(seconds / 86_400), 'day');
  return dateFmt.format(new Date(iso));
}

/** ISO string -> value for <input type="datetime-local"> in the viewer's timezone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
