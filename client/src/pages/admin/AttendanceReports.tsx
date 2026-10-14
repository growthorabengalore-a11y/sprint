import { useRef, useState } from 'react';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import { useFetch } from '../../components/useFetch';
import { ErrorBox, Skeleton, StatusBadge, toast } from '../../components/ui';
import { fmtHM, fmtTime, fmtDate, addDays } from '../../utils/format';
import { downloadPng } from '../../utils/exportPng';
import AttendancePng from '../../reports/AttendancePng';

export default function AttendanceReports() {
  const today = useFetch('/dashboard/stats').data?.today as string | undefined;
  const [preset, setPreset] = useState('week'); const [custom, setCustom] = useState({ from: '', to: '' }); const [emp, setEmp] = useState(''); const [busy, setBusy] = useState(false);
  const emps = useFetch('/employees', { limit: 200 });
  const t = today || '';
  const range = preset === 'daily' ? { from: t, to: t } : preset === 'week' ? { from: t && addDays(t, -6), to: t } : preset === 'month' ? { from: t && t.slice(0, 8) + '01', to: t } : custom;
  const ok = !!range.from && !!range.to && range.from <= range.to;
  const { data, loading, error, reload } = useFetch(ok ? '/attendance/report' : null, { ...range, employeeId: emp || undefined });
  const png = useRef<HTMLDivElement>(null);
  const one = emp && data?.employees?.[0];
  const exp = async () => { if (!png.current) return; setBusy(true); try { await downloadPng(png.current, `Attendance-${range.from}_${range.to}${emp ? '-' + one?.employeeId : ''}.png`); } catch { toast('PNG export failed', 'err'); } finally { setBusy(false); } };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Attendance Reports</h1>
      <div className="card grid grid-cols-2 gap-3 p-3 md:grid-cols-5">
        <div><label className="label">Report</label><select className="input" value={preset} onChange={(e) => setPreset(e.target.value)}><option value="daily">Daily (today)</option><option value="week">Weekly (last 7 days)</option><option value="month">Monthly (this month)</option><option value="custom">Custom range</option></select></div>
        {preset === 'custom' && <><div><label className="label">From</label><input type="date" className="input" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></div><div><label className="label">To</label><input type="date" className="input" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></div></>}
        <div><label className="label">Employee</label><select className="input" value={emp} onChange={(e) => setEmp(e.target.value)}><option value="">All employees</option>{emps.data?.items.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}</select></div>
        <div className="flex items-end gap-2"><button className="btn btn-ghost" onClick={reload}><FiRefreshCw /></button><button className="btn btn-primary flex-1" disabled={!data || busy} onClick={exp}><FiDownload /> {busy ? '…' : 'PNG'}</button></div>
      </div>
      {ok && <div className="text-sm font-semibold text-crimson-700">{fmtDate(range.from)} → {fmtDate(range.to)} · {data?.days ?? '…'} working days</div>}
      <p className="text-xs text-slate-500">Attendance % = (Present days + 0.5 × Half days) ÷ working days in range × 100. “Needs Review” and “In Progress” days are not counted until resolved.</p>
      {error && <ErrorBox text={error} onRetry={reload} />}
      <div className="card overflow-x-auto"><table className="w-full"><thead><tr>{['ID', 'Name', 'Total hours', 'Present', 'Half', 'Absent', 'Review', 'Late', 'Avg hours', 'Attendance %'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{loading && !data ? <tr><td className="td" colSpan={10}><Skeleton className="h-8 w-full" /></td></tr> : data?.employees.map((e: any) => <tr key={e.employeeId}><td className="td">{e.employeeId}</td><td className="td font-semibold">{e.name}</td><td className="td">{fmtHM(e.totalMinutes)}</td><td className="td">{e.presentDays}</td><td className="td">{e.halfDays}</td><td className="td">{e.absentDays}</td><td className="td">{e.reviewDays}</td><td className="td">{e.lateArrivals}</td><td className="td">{fmtHM(e.averageMinutes)}</td><td className="td font-bold">{e.attendancePercent != null ? `${e.attendancePercent}%` : '—'}</td></tr>)}</tbody></table></div>
      {one && <div className="card overflow-x-auto"><div className="p-3 font-bold">{one.name} — daily rows</div><table className="w-full"><thead><tr>{['Date', 'Check-in', 'Check-out', 'Hours', 'Status', 'Late'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{one.rows.map((r: any) => <tr key={r.date}><td className="td">{fmtDate(r.date)}</td><td className="td">{fmtTime(r.checkIn)}</td><td className="td">{fmtTime(r.checkOut)}</td><td className="td">{fmtHM(r.workingMinutes)}</td><td className="td"><StatusBadge s={r.status} /></td><td className="td">{r.late ? `${r.minutesLate} min` : '—'}</td></tr>)}</tbody></table></div>}
      {data && <div style={{ position: 'fixed', left: -12000, top: 0 }} aria-hidden><AttendancePng ref={png} mode="range" title={emp && one ? `${one.name} — Attendance Report` : 'Attendance Report'} subtitle={`${fmtDate(range.from)} to ${fmtDate(range.to)}`} data={data} /></div>}
    </div>
  );
}
