import { useMemo, useRef, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import { useFetch } from '../../components/useFetch';
import { ErrorBox, Skeleton, StatusBadge, toast } from '../../components/ui';
import { fmtMinutes, inr, pct, fmtDate, rangeFor, monthWeeks, payCell } from '../../utils/format';
import { downloadPng } from '../../utils/exportPng';
import RangeSprintPng from '../../reports/RangeSprintPng';

const KINDS = [['1w', '1-week report'], ['2w', '2-week report'], ['3w', '3-week report'], ['month', '1-month report'], ['week1', 'Week 1'], ['week2', 'Week 2'], ['week3', 'Week 3'], ['week4', 'Week 4'], ['week5', 'Week 5'], ['custom', 'Custom range']];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PerformanceReports() {
  const settings = useFetch('/settings/public');
  const ws = settings.data?.settings?.weekStartDay ?? 1;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear()); const [month, setMonth] = useState(now.getMonth());
  const [kind, setKind] = useState('month'); const [custom, setCustom] = useState({ from: '', to: '' });
  const [emp, setEmp] = useState(''); const [busy, setBusy] = useState(false);
  const range = rangeFor(kind, year, month, ws, custom);
  const ready = !!range.from && !!range.to && range.from <= range.to;
  const emps = useFetch('/employees', { limit: 200 });
  const { data, loading, error, reload } = useFetch(ready ? '/sprints/report' : null, { ...range, employeeId: emp || undefined });
  const png = useRef<HTMLDivElement>(null);
  const weekly = useMemo(() => {
    if (!data) return [];
    return monthWeeks(year, month, ws).map((w, i) => { const d = data.daily.filter((x: any) => x.date >= w.from && x.date <= w.to);
      const p = d.filter((x: any) => x.averagePerformance != null);
      return { week: `W${i + 1}`, talk: d.reduce((s: number, x: any) => s + x.talkMinutes, 0), leads: d.reduce((s: number, x: any) => s + x.leads, 0), payments: d.reduce((s: number, x: any) => s + x.payments, 0), perf: p.length ? Math.round(p.reduce((s: number, x: any) => s + x.averagePerformance, 0) / p.length * 100) / 100 : null }; });
  }, [data, year, month, ws]);
  const title = emp ? `${emps.data?.items.find((e: any) => e.id === emp)?.name || 'Employee'} - Sprint Report` : `${KINDS.find((k) => k[0] === kind)?.[1]} - Sprint Report`;
  const exp = async () => { if (!png.current) return; setBusy(true); try { await downloadPng(png.current, `${title}-${range.from}_${range.to}.png`); } catch { toast('PNG export failed', 'err'); } finally { setBusy(false); } };
  const sel = data?.employees?.[0];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Performance Reports</h1>
      <div className="card grid grid-cols-2 gap-3 p-3 md:grid-cols-6">
        <div><label className="label">Month</label><select className="input" value={month} onChange={(e) => setMonth(+e.target.value)}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></div>
        <div><label className="label">Year</label><select className="input" value={year} onChange={(e) => setYear(+e.target.value)}>{Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i).map((y) => <option key={y}>{y}</option>)}</select></div>
        <div><label className="label">Range</label><select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div><label className="label">Employee</label><select className="input" value={emp} onChange={(e) => setEmp(e.target.value)}><option value="">All employees</option>{emps.data?.items.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}</select></div>
        {kind === 'custom' && <><div><label className="label">From</label><input type="date" className="input" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></div><div><label className="label">To</label><input type="date" className="input" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></div></>}
        <div className="col-span-2 flex items-end gap-2 md:col-span-1"><button className="btn btn-ghost" onClick={reload}><FiRefreshCw /></button><button className="btn btn-primary flex-1" disabled={!data || busy} onClick={exp}><FiDownload /> {busy ? '…' : 'PNG'}</button></div>
      </div>
      <div className="text-sm font-semibold text-crimson-700">{ready ? `${fmtDate(range.from)} → ${fmtDate(range.to)}` : 'Select a valid date range'}</div>
      {error && <ErrorBox text={error} onRetry={reload} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Total Talk Time', data && fmtMinutes(data.totals.talkMinutes)], ['Total Leads', data?.totals.leads], ['Confirmed Payments', data && inr(data.totals.confirmedPayments)], ['Overall (period) Performance', data && pct(data.overallPerformance)],
          ['Avg Daily Performance', data && pct(data.averageDailyPerformance)], ['Completed Sprint Days', data?.completedSprintDays], ['Missing Submissions', data?.missingSubmissions], ['Top Performer', data && (data.topPerformer ? `${data.topPerformer.name} · ${pct(data.topPerformer.performance)}` : 'No data')]].map(([k, v]) =>
          <div key={k as string} className="card p-4"><div className="text-xs font-semibold text-slate-500">{k}</div>{loading && !data ? <Skeleton className="mt-2 h-6 w-24" /> : <div className="break-words text-lg font-extrabold">{v as any}</div>}</div>)}
      </div>
      {data && <div className="grid gap-3 lg:grid-cols-2">
        <Chart title="Daily performance trend (%)"><LineChart data={data.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip /><Line type="monotone" dataKey="averagePerformance" name="Performance %" stroke="#9b1b30" strokeWidth={2} connectNulls /></LineChart></Chart>
        <Chart title="Leads over time"><BarChart data={data.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="leads" fill="#1f3a6e" /></BarChart></Chart>
        <Chart title="Payments over time (₹)"><BarChart data={data.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: any) => inr(v)} /><Bar dataKey="payments" fill="#b3213a" /></BarChart></Chart>
        <Chart title="Talk time over time (minutes)"><LineChart data={data.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: any) => fmtMinutes(v)} /><Line type="monotone" dataKey="talkMinutes" name="Talk" stroke="#1f3a6e" strokeWidth={2} /></LineChart></Chart>
        <Chart title="Week-wise comparison (this month)"><BarChart data={weekly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend /><Bar dataKey="leads" fill="#1f3a6e" /><Bar dataKey="perf" name="Avg perf %" fill="#9b1b30" /></BarChart></Chart>
      </div>}
      <div className="card overflow-x-auto"><table className="w-full"><thead><tr>{['Rank', 'Name', 'Talk Time', 'Leads', 'Payments', 'Avg Daily %', 'Period %', 'Done days', 'Missing'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{data?.employees.map((e: any) => <tr key={e.employeeId} className="cursor-pointer hover:bg-crimson-50" onClick={() => setEmp(e._id)}><td className="td">{e.rank ?? '—'}</td><td className="td font-semibold">{e.name}</td><td className="td">{fmtMinutes(e.talkMinutes)}</td><td className="td">{e.leads}</td><td className="td">{inr(e.confirmedPayments)}</td><td className="td">{pct(e.averageDailyPerformance)}</td><td className="td font-bold">{pct(e.periodPerformance)}</td><td className="td">{e.completedDays}</td><td className="td">{e.missingSubmissions}</td></tr>)}
          {!data?.employees.length && !loading && <tr><td className="td text-center text-slate-500" colSpan={9}>No data</td></tr>}</tbody></table></div>
      {emp && sel && <div className="card overflow-x-auto"><div className="p-3 font-bold">{sel.name} — daily history</div><table className="w-full"><thead><tr>{['Date', 'Morning (plan)', 'Evening (achieved)', 'Performance', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{sel.rows.map((r: any) => <tr key={r.date}><td className="td">{fmtDate(r.date)}</td><td className="td text-sm">{r.morning ? `${fmtMinutes(r.morning.talkTimeMinutes)} · ${r.morning.leads} · ${payCell(r.morning)}` : '—'}</td><td className="td text-sm">{r.evening ? `${fmtMinutes(r.evening.talkTimeMinutes)} · ${r.evening.leads} · ${payCell(r.evening)}` : '—'}</td><td className="td font-bold">{pct(r.performance)}</td><td className="td"><StatusBadge s={r.status} /></td></tr>)}</tbody></table></div>}
      {data && <div style={{ position: 'fixed', left: -12000, top: 0 }} aria-hidden><RangeSprintPng ref={png} data={data} title={title} /></div>}
    </div>
  );
}
function Chart({ title, children }: any) { return <div className="card p-3"><div className="mb-2 text-sm font-bold">{title}</div><div className="h-56"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></div>; }
