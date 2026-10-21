import { useState } from 'react';
import { FiCamera, FiLogIn, FiLogOut, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '../../auth';
import { useFetch } from '../../components/useFetch';
import { RegisterFaceModal, VerifyModal } from '../../components/FaceCamera';
import { ErrorBox, Skeleton, StatusBadge, toast, Empty } from '../../components/ui';
import { fmtDate, fmtHM, fmtTime, addDays } from '../../utils/format';

export default function Attendance() {
  const { user, refresh } = useAuth();
  const elig = useFetch('/attendance/eligibility');
  const [range, setRange] = useState('week'); const [custom, setCustom] = useState({ from: '', to: '' });
  const t = elig.data?.dateKey as string | undefined;
  const r = range === 'today' ? { from: t, to: t } : range === 'week' ? { from: t && addDays(t, -6), to: t } : range === 'month' ? { from: t && t.slice(0, 8) + '01', to: t } : custom;
  const hist = useFetch(r.from && r.to ? '/attendance/my' : null, r);
  const [modal, setModal] = useState<'register' | 'in' | 'out' | null>(null);
  const d = elig.data; const rec = d?.record;
  if (elig.loading && !d) return <Skeleton className="h-40 w-full" />;
  if (elig.error) return <ErrorBox text={elig.error} onRetry={elig.reload} />;
  const afterAction = async (msg: string) => { setModal(null); toast(msg); await elig.reload(); hist.reload(); };
  const status = rec?.status || 'Not checked in';
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">Take Attendance</h1>
      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between"><div><div className="font-bold">{user.name}</div><div className="text-sm text-slate-500">{user.employeeId} · {fmtDate(d.dateKey)}</div></div>{rec ? <StatusBadge s={status} /> : <span className="text-sm text-slate-500">{status}</span>}</div>
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-sm"><div><div className="text-xs text-slate-500">Check-in</div>{fmtTime(rec?.checkIn)}{rec?.late && <span className="ml-1 text-xs text-red-600">late</span>}</div><div><div className="text-xs text-slate-500">Check-out</div>{fmtTime(rec?.checkOut)}</div><div><div className="text-xs text-slate-500">Working hours</div>{fmtHM(rec?.workingMinutes)}</div></div>
        {!d.faceRegistered && <button className="btn btn-ghost w-full" onClick={() => setModal('register')}><FiUserPlus /> Register My Face</button>}
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="btn btn-primary" disabled={!d.canCheckIn} onClick={() => setModal('in')}><FiLogIn /> Check In</button>
          <button className="btn btn-primary" disabled={!d.canCheckOut} onClick={() => setModal('out')}><FiLogOut /> Check Out</button></div>
        {rec?.checkOut && <p className="text-center text-xs text-slate-500">Done for today. Check-in reopens from 8:00 AM the next working day.</p>}
        {!d.faceRegistered && <p className="text-center text-xs text-slate-500">Register your face once to enable check-in.</p>}
      </div>
      <div className="card p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="font-bold">My attendance history</h2>
        <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value)}><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option><option value="custom">Custom</option></select>
        {range === 'custom' && <><input type="date" className="input !w-auto" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /><input type="date" className="input !w-auto" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></>}</div>
        {!hist.data?.items?.length ? <Empty text="No attendance records" /> : <div className="overflow-x-auto"><table className="w-full min-w-[480px]"><thead><tr>{['Date', 'Check-in', 'Check-out', 'Hours', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{hist.data.items.map((a: any) => <tr key={a.attendanceId}><td className="td">{fmtDate(a.dateKey)}</td><td className="td">{fmtTime(a.checkIn)}{a.late && <span className="ml-1 text-xs text-red-600">late</span>}</td><td className="td">{fmtTime(a.checkOut)}</td><td className="td">{fmtHM(a.workingMinutes)}</td><td className="td"><StatusBadge s={a.status} /></td></tr>)}</tbody></table></div>}</div>
      <p className="flex items-center gap-1 text-xs text-slate-400"><FiCamera /> Face data stays on Growthora's own server and is never sent to third parties.</p>
      {modal === 'register' && <RegisterFaceModal onClose={() => setModal(null)} onDone={async () => { await refresh(); const e = await elig.reload(); toast('Face registered. Opening camera for check-in…'); setModal('in'); }} />}
      {modal === 'in' && <VerifyModal mode="check-in" requireLiveness={d.settings.requireLiveness} onClose={() => setModal(null)} onDone={() => afterAction('Checked in successfully')} />}
      {modal === 'out' && <VerifyModal mode="check-out" requireLiveness={d.settings.requireLiveness} onClose={() => setModal(null)} onDone={() => afterAction('Checked out successfully')} />}
    </div>
  );
}
