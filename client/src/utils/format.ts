export const fmtMinutes = (m?: number | null) => {
  if (m == null) return '—';
  const h = Math.floor(m / 60), r = m % 60;
  const hs = h ? `${h} hour${h > 1 ? 's' : ''}` : '';
  const ms = r ? `${r} min` : '';
  return [hs, ms].filter(Boolean).join(' ') || '0 min';
};
export const fmtHM = (m?: number | null) => (m ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : '—');
export const inr = (n?: number | null) => (n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n));
export const pct = (n?: number | null) => (n == null ? '—' : `${n.toFixed(2)}%`);
export const fmtTime = (iso?: string | null, tz = 'Asia/Kolkata') => (iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }) : '—');
export const fmtDate = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }); };
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const titleDate = (k: string) => { const [y, m, d] = k.split('-'); return `${MON[+m - 1]}-${d}-${y}`; };
export const nowStamp = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
export const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const hhmmToMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const payCell = (s: any) => (!s ? 'Missing' : s.paymentStatus === 'not_confirm' ? 'Not Confirm' : inr(s.paymentAmount));

// ---- dropdown options ----
export const talkOptions = Array.from({ length: 23 }, (_, i) => { const m = (i + 1) * 10; return { value: String(m), label: fmtMinutes(m) }; });
export const leadOptions = Array.from({ length: 51 }, (_, i) => ({ value: String(i), label: String(i) }));
export const payOptions = [{ value: 'nc', label: 'Not Confirm' }, { value: '0', label: '₹0' },
  ...Array.from({ length: 1999 }, (_, i) => { const a = 1000 + i * 500; return { value: String(a), label: inr(a) }; })];

// ---- dates ----
const pad = (n: number) => String(n).padStart(2, '0');
export const addDays = (k: string, n: number) => { const [y, m, d] = k.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };
const dow = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
export const lastOfMonth = (y: number, m0: number) => `${y}-${pad(m0 + 1)}-${pad(new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate())}`;
/** Week-aligned segments of a month (aligned to weekStart, clamped to the month). */
export function monthWeeks(y: number, m0: number, weekStart: number) {
  const first = `${y}-${pad(m0 + 1)}-01`, last = lastOfMonth(y, m0);
  const out: { from: string; to: string }[] = [];
  let from = first;
  while (from <= last) {
    const toWeekEnd = addDays(from, (weekStart + 6 - dow(from) + 7) % 7); // day before next weekStart
    const to = toWeekEnd > last ? last : toWeekEnd;
    out.push({ from, to }); from = addDays(to, 1);
  }
  return out;
}
export function rangeFor(kind: string, y: number, m0: number, weekStart: number, custom: { from: string; to: string }) {
  const weeks = monthWeeks(y, m0, weekStart);
  const first = `${y}-${pad(m0 + 1)}-01`, last = lastOfMonth(y, m0);
  if (kind === 'month') return { from: first, to: last };
  if (kind === 'custom') return custom;
  const m = kind.match(/^(\d)w$/); // N-week = Week 1..N
  if (m) return { from: first, to: weeks[Math.min(+m[1], weeks.length) - 1].to };
  const w = kind.match(/^week(\d)$/);
  if (w) { const x = weeks[+w[1] - 1]; return x || { from: first, to: last }; }
  return { from: first, to: last };
}
