import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiUserCheck, FiUserX, FiSend, FiClock, FiPhoneCall, FiTarget, FiDollarSign, FiActivity, FiSun, FiMoon, FiAward, FiRefreshCw, FiBarChart2 } from 'react-icons/fi';
import { useFetch } from '../../components/useFetch';
import { Skeleton, ErrorBox, Modal, Empty } from '../../components/ui';
import { fmtMinutes, inr, pct } from '../../utils/format';

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch('/dashboard/stats');
  const nav = useNavigate(); const [rank, setRank] = useState(false);
  const c = data?.cards;
  const top = (t: any) => (t ? `${t.name} · ${pct(t.performance)}` : 'No data');
  const cards: any[] = c ? [
    ['Total Employees', c.totalEmployees, FiUsers, '/admin/champs'], ['Active Employees', c.activeEmployees, FiUserCheck, '/admin/champs'], ['Disabled Employees', c.disabledEmployees, FiUserX, '/admin/champs'],
    ["Today's Sprint Submissions", c.todaySubmissions, FiSend, '/admin/sprint-reports'], ['Pending Sprint Updates', c.pendingSprintUpdates, FiClock, '/admin/sprint-reports'],
    ["Today's Total Talk Time", fmtMinutes(c.todayTalkMinutes), FiPhoneCall, '/admin/sprint-reports'], ["Today's Total Leads", c.todayLeads, FiTarget, '/admin/sprint-reports'], ["Today's Total Payments", inr(c.todayPayments), FiDollarSign, '/admin/sprint-reports'],
    ["Today's Average Performance", pct(c.todayAveragePerformance), FiActivity, '/admin/sprint-reports'], ['Morning Submissions', c.morningSubmissions, FiSun, '/admin/sprint-reports'], ['Evening Submissions', c.eveningSubmissions, FiMoon, '/admin/sprint-reports'],
    ["Today's Top Performer", top(c.todayTopPerformer), FiAward, '/admin/sprint-reports'],
    ['Weekly Total Talk Time', fmtMinutes(c.weeklyTalkMinutes), FiPhoneCall, '/admin/performance'], ['Weekly Total Leads', c.weeklyLeads, FiTarget, '/admin/performance'], ['Weekly Total Payments', inr(c.weeklyPayments), FiDollarSign, '/admin/performance'],
    ['Monthly Total Talk Time', fmtMinutes(c.monthlyTalkMinutes), FiPhoneCall, '/admin/performance'], ['Monthly Total Leads', c.monthlyLeads, FiTarget, '/admin/performance'], ['Monthly Total Payments', inr(c.monthlyPayments), FiDollarSign, '/admin/performance'],
    ['Monthly Top Performer', top(c.monthlyTopPerformer), FiAward, '/admin/performance'], ['Employee Performance Ranking', `${c.ranking.length} ranked`, FiBarChart2, 'rank'],
  ] : [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">Dashboard {data && <span className="text-sm font-normal text-slate-500">· {data.today}</span>}</h1><button className="btn btn-ghost" onClick={reload}><FiRefreshCw /> Refresh</button></div>
      {error && <ErrorBox text={error} onRetry={reload} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading && !data ? Array.from({ length: 20 }).map((_, i) => <div key={i} className="card p-4"><Skeleton className="h-4 w-28 mb-3" /><Skeleton className="h-7 w-20" /></div>)
          : cards.map(([label, value, Icon, to]) => (
            <button key={label} onClick={() => (to === 'rank' ? setRank(true) : nav(to))} className="card p-4 text-left transition hover:shadow-md hover:border-crimson-500">
              <div className="flex items-center justify-between text-slate-500"><span className="text-xs font-semibold">{label}</span><Icon className="text-crimson-600" /></div>
              <div className="mt-2 break-words text-xl font-extrabold">{value}</div>
            </button>))}
      </div>
      {rank && c && <Modal title="Employee Performance Ranking (this month)" onClose={() => setRank(false)}>
        {c.ranking.length ? <table className="w-full"><thead><tr><th className="th">#</th><th className="th">Name</th><th className="th">ID</th><th className="th">Performance</th></tr></thead>
          <tbody>{c.ranking.map((r: any) => <tr key={r.employeeId}><td className="td">{r.rank}</td><td className="td font-semibold">{r.name}</td><td className="td">{r.employeeId}</td><td className="td">{pct(r.performance)}</td></tr>)}</tbody></table> : <Empty text="No ranked employees yet" />}</Modal>}
    </div>
  );
}
