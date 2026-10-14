// All "day" logic is server-side in the configured timezone (never the device clock).
const fmtCache = new Map();
function dtf(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }));
  }
  return fmtCache.get(tz);
}
export function parts(date, tz) {
  const o = {};
  for (const p of dtf(tz).formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, hh: +o.hour, mm: +o.minute };
}
export const pad = (n) => String(n).padStart(2, '0');
export function localDateKey(date, tz) {
  const p = parts(date, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}
export function minuteOfDay(date, tz) {
  const p = parts(date, tz);
  return p.hh * 60 + p.mm;
}
export function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
export function weekday(dateKey) { // 0=Sun..6=Sat
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export function rangeKeys(from, to) {
  const out = [];
  if (from > to) return out;
  for (let k = from, i = 0; k <= to && i < 800; k = addDays(k, 1), i++) out.push(k);
  return out;
}
/**
 * Business date: the day rolls over at workStart (default 08:00), not at midnight.
 * Before 08:00 the business day is still yesterday, so a finished sprint/attendance day
 * does not reopen until 8:00 AM the next day.
 */
export function businessDateKey(now, settings) {
  const key = localDateKey(now, settings.timezone);
  return minuteOfDay(now, settings.timezone) < settings.workStartMinutes ? addDays(key, -1) : key;
}
export function isValidDateKey(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)); }
