import { Link } from 'react-router-dom';
import { FiCamera, FiEdit3 } from 'react-icons/fi';
import { useAuth } from '../../auth';
import { useFetch } from '../../components/useFetch';
import { addDays, fmtDate, fmtMinutes, pct, payCell } from '../../utils/format';
import { StatusBadge, Empty, Skeleton } from '../../components/ui';
import { useState } from 'react';

export default function Home() {
  const { user } = useAuth();
  const [range, setRange] = useState('week'); const [custom, setCustom] = useState({ from: '', to: '' });
  const elig = useFetch('/sprints/eligibility');
  const today = elig.data?.dateKey as string | undefined;
  const r = range === 'today' ? { from: today, to: today } : range === 'week' ? { from: today && addDays(today, -6), to: today } : range === 'month' ? { from: today && today.slice(0, 8) + '01', to: today } : custom;
  const ok = !!r.from && !!r.to && r.from <= r.to;
  const hist = useFetch(ok ? '/sprints/my' : null, r);
  const rows: any[] = (hist.data?.rows || []).filter((x: any) => x.morning || x.evening).slice().reverse();
  return (
    <div className="space-y-4">
      <div className="card p-5"><div className="text-sm text-slate-500">Welcome</div><div className="text-2xl font-extrabold">{user.name}</div><div className="text-sm text-slate-600">{user.employeeId}</div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/app/attendance" className="card flex items-center gap-4 p-6 hover:border-crimson-500 hover:shadow-md"><FiCamera size={30} className="text-crimson-600" /><div><div className="text-lg font-bold">1. Take Attendance</div><div className="text-sm text-slate-500">Face check-in / check-out</div></div></Link>
        <Link to="/app/sprint" className="card flex items-center gap-4 p-6 hover:border-crimson-500 hover:shadow-md"><FiEdit3 size={30} className="text-crimson-600" /><div><div className="text-lg font-bold">2. Update Sprint / Projection</div><div className="text-sm text-slate-500">Morning plan &amp; evening achieved</div></div></Link>
      </div>
      <div className="card p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="font-bold">My sprint records</h2>
        <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value)}><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option><option value="custom">Custom</option></select>
        {range === 'custom' && <><input type="date" className="input !w-auto" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /><input type="date" className="input !w-auto" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></>}</div>
        {hist.loading && !hist.data ? <Skeleton className="h-20 w-full" /> : !rows.length ? <Empty text="No records in this period" /> : <div className="overflow-x-auto"><table className="w-full min-w-[520px]"><thead><tr>{['Date', 'Session', 'Talk Time', 'Leads', 'Payments', 'Performance %'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{rows.map((d) => ['morning', 'evening'].map((s) => { const x = d[s]; return <tr key={d.date + s}>{s === 'morning' && <td className="td font-semibold" rowSpan={2}>{fmtDate(d.date)}<div className="font-name text-xs font-normal text-slate-500">{user.name}</div></td>}
            <td className="td capitalize">{s}</td><td className="td">{x ? fmtMinutes(x.talkTimeMinutes) : '—'}</td><td className="td">{x ? x.leads : '—'}</td><td className="td">{x ? payCell(x) : '—'}</td>
            <td className="td font-bold">{s === 'evening' ? (d.performance != null ? pct(d.performance) : <StatusBadge s={d.status} />) : ''}</td></tr>; }))}</tbody></table></div>}
      </div>
    </div>
  );
}
