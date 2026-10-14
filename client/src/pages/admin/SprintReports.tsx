import { useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiDownload, FiSearch } from 'react-icons/fi';
import { useFetch } from '../../components/useFetch';
import { ErrorBox, Skeleton, StatusBadge, toast } from '../../components/ui';
import { fmtMinutes, inr, pct, payCell, addDays, titleDate } from '../../utils/format';
import { downloadPng } from '../../utils/exportPng';
import DailySprintPng from '../../reports/DailySprintPng';

export default function SprintReports() {
  const stats = useFetch('/dashboard/stats');
  const [date, setDate] = useState<string>('');
  const eff = date || stats.data?.today || '';
  const { data, loading, error, reload } = useFetch(eff ? '/sprints/daily' : null, { date: eff });
  const [q, setQ] = useState(''); const [sort, setSort] = useState<'name' | 'perf'>('name'); const [busy, setBusy] = useState(false);
  const png = useRef<HTMLDivElement>(null);
  let rows: any[] = data?.employees || [];
  rows = rows.filter((e) => (e.name + e.employeeId).toLowerCase().includes(q.toLowerCase()));
  if (sort === 'perf') rows = [...rows].sort((a, b) => (b.performance ?? -1) - (a.performance ?? -1)); else rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  const exp = async () => { if (!png.current) return; setBusy(true); try { await downloadPng(png.current, `Sprint-Updates-${eff}.png`); } catch { toast('PNG export failed', 'err'); } finally { setBusy(false); } };
  const miss = <span className="font-semibold text-red-600">Missing</span>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Sprint Reports</h1>
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <button className="btn btn-ghost !px-3" onClick={() => setDate(addDays(eff, -1))}><FiChevronLeft /></button>
        <input type="date" className="input !w-auto" value={eff} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <button className="btn btn-ghost !px-3" onClick={() => setDate(addDays(eff, 1))}><FiChevronRight /></button>
        <button className="btn btn-ghost" onClick={() => setDate('')}>Today</button>
        <button className="btn btn-ghost" onClick={reload}><FiRefreshCw /> Refresh</button>
        <button className="btn btn-primary ml-auto" disabled={!data || busy} onClick={exp}><FiDownload /> {busy ? 'Preparing…' : 'Download PNG'}</button>
      </div>
      {error && <ErrorBox text={error} onRetry={reload} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {[['Total Talk Time', data && fmtMinutes(data.totals.talkMinutes)], ['Total Leads', data?.totals.leads], ['Total Confirmed Payments', data && inr(data.totals.confirmedPayments)], ['Pending Payments (days)', data?.totals.pendingPayments]].map(([k, v]) =>
          <div key={k as string} className="card p-4"><div className="text-xs font-semibold text-slate-500">{k}</div>{loading && !data ? <Skeleton className="mt-2 h-7 w-24" /> : <div className="text-xl font-extrabold">{v}</div>}</div>)}
      </div>
      <div className="flex flex-wrap gap-2"><div className="relative min-w-[200px] flex-1"><FiSearch className="absolute left-3 top-3.5 text-slate-400" /><input className="input pl-9" placeholder="Search employee" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="name">Sort: Name</option><option value="perf">Sort: Performance</option></select></div>
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full"><thead><tr>{['Name', 'Session', 'Talk Time', 'Leads', 'Payments', 'Performance %'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{rows.map((e) => ['morning', 'evening'].map((s) => { const x = e[s]; return (
            <tr key={e.employeeId + s} className={s === 'evening' ? 'bg-slate-50/60' : ''}>
              {s === 'morning' && <td rowSpan={2} className="td align-middle font-semibold">{e.name}<div className="text-xs font-normal text-slate-500">{e.employeeId}</div></td>}
              <td className="td capitalize">{s}</td><td className="td">{x ? fmtMinutes(x.talkTimeMinutes) : miss}</td><td className="td">{x ? x.leads : miss}</td>
              <td className={`td ${!x || x.paymentStatus === 'not_confirm' ? 'text-red-600' : ''}`}>{x ? payCell(x) : miss}</td>
              <td className="td font-bold">{s === 'evening' ? (e.performance != null ? pct(e.performance) : <StatusBadge s={e.status} />) : ''}{s === 'evening' && e.pendingPayment && <span className="ml-1 text-xs text-orange-600">pending payment</span>}</td></tr>); }))}
            {!rows.length && !loading && <tr><td className="td text-center text-slate-500" colSpan={6}>No employees</td></tr>}</tbody></table></div>
      <div className="space-y-3 md:hidden">{rows.map((e) => <div key={e.employeeId} className="card p-4"><div className="flex items-center justify-between"><div className="font-bold">{e.name}</div><div className="font-extrabold text-crimson-700">{e.performance != null ? pct(e.performance) : <StatusBadge s={e.status} />}</div></div>
        {['morning', 'evening'].map((s) => { const x = e[s]; return <div key={s} className="mt-2 rounded-lg bg-slate-50 p-2 text-sm"><div className="font-semibold capitalize">{s}</div>{x ? <div className="grid grid-cols-3 gap-1"><span>{fmtMinutes(x.talkTimeMinutes)}</span><span>{x.leads} leads</span><span className={x.paymentStatus === 'not_confirm' ? 'text-red-600' : ''}>{payCell(x)}</span></div> : miss}</div>; })}</div>)}</div>
      {data && <div style={{ position: 'fixed', left: -12000, top: 0 }} aria-hidden><DailySprintPng ref={png} data={data} /></div>}
    </div>
  );
}
