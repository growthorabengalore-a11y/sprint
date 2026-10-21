import { useRef, useState } from 'react';
import { FiRefreshCw, FiDownload, FiUsers, FiCheckCircle, FiCoffee, FiUserX, FiLogIn, FiLogOut, FiAlertTriangle, FiPercent, FiEdit } from 'react-icons/fi';
import { api, errMsg } from '../../api';
import { useFetch } from '../../components/useFetch';
import { ErrorBox, Modal, StatusBadge, Skeleton, toast, Empty } from '../../components/ui';
import { fmtHM, fmtTime, fmtDate } from '../../utils/format';
import { downloadPng } from '../../utils/exportPng';
import AttendancePng from '../../reports/AttendancePng';

export default function AttendanceDashboard() {
  const [date, setDate] = useState('');
  const { data, loading, error, reload } = useFetch('/attendance/daily', date ? { date } : {});
  const [modal, setModal] = useState<string | null>(null); const [fix, setFix] = useState<any>(null); const [manual, setManual] = useState<any>(null);
  const png = useRef<HTMLDivElement>(null); const [busy, setBusy] = useState(false);
  const rows: any[] = data?.rows || []; const c = data?.cards;
  const list = (k: string) => k === 'late' ? rows.filter((r) => r.late) : k === 'present' ? rows.filter((r) => r.status === 'Present') : k === 'half' ? rows.filter((r) => r.status === 'Half Day') : rows.filter((r) => r.status === 'Absent');
  const cards: any[] = c ? [['Total Employees', c.totalEmployees, FiUsers], ['Present Today', c.present, FiCheckCircle, 'present'], ['Half Day', c.halfDay, FiCoffee, 'half'], ['Absent', c.absent, FiUserX, 'absent'], ['Checked In', c.checkedIn, FiLogIn], ['Checked Out', c.checkedOut, FiLogOut], ['Late Comers', c.lateComers, FiAlertTriangle, 'late'], ['Attendance Completion', `${c.completionPercent}%`, FiPercent]] : [];
  const exp = async () => { if (!png.current) return; setBusy(true); try { await downloadPng(png.current, `Attendance-${data.date}.png`); } catch { toast('PNG export failed', 'err'); } finally { setBusy(false); } };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Attendance Dashboard</h1>
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input type="date" className="input !w-auto" value={date || data?.date || ''} onChange={(e) => setDate(e.target.value)} />
        <button className="btn btn-ghost" onClick={() => setDate('')}>Today</button><button className="btn btn-ghost" onClick={reload}><FiRefreshCw /> Refresh</button>
        <button className="btn btn-primary ml-auto" disabled={!data || busy} onClick={exp}><FiDownload /> {busy ? 'Preparing…' : 'Download PNG'}</button>
      </div>
      {error && <ErrorBox text={error} onRetry={reload} />}
      {data?.nonWorkingDay && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This date is a weekend/holiday (non-working). Nobody is counted absent.</div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading && !data ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-4"><Skeleton className="h-12 w-full" /></div>) : cards.map(([k, v, Icon, m]) => (
          <button key={k} disabled={!m} onClick={() => m && setModal(m)} className={`card p-4 text-left ${m ? 'hover:border-crimson-500 hover:shadow-md' : 'cursor-default'}`}><div className="flex justify-between text-slate-500"><span className="text-xs font-semibold">{k}</span><Icon className="text-crimson-600" /></div><div className="mt-1 text-2xl font-extrabold">{v}</div></button>))}
      </div>
      <div className="card hidden overflow-x-auto md:block"><table className="w-full"><thead><tr>{['ID', 'Name', 'Check-in', 'Check-out', 'Hours', 'Status', 'Verification', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="td">{r.employeeId}</td><td className="td font-semibold">{r.name}</td><td className="td">{fmtTime(r.checkIn)}{r.late && <span className="ml-1 text-xs text-red-600">+{r.minutesLate}m</span>}</td><td className="td">{fmtTime(r.checkOut)}</td><td className="td">{fmtHM(r.workingMinutes)}</td><td className="td"><StatusBadge s={r.status} /></td>
          <td className="td text-sm">{r.verification || '-'}{r.corrected && <span className="ml-1 rounded bg-purple-100 px-1 text-xs text-purple-700">corrected</span>}</td>
          <td className="td"><div className="flex gap-1">{!r.checkIn && !data.nonWorkingDay && <button className="btn btn-ghost !px-2 !min-h-[36px] text-xs" onClick={() => setManual({ r, type: 'checkin' })}>Manual in</button>}{r.checkIn && !r.checkOut && <button className="btn btn-ghost !px-2 !min-h-[36px] text-xs" onClick={() => setManual({ r, type: 'checkout' })}>Manual out</button>}{r.checkIn && <button title="Correct" className="btn btn-ghost !px-2 !min-h-[36px]" onClick={() => setFix(r)}><FiEdit /></button>}</div></td></tr>)}
          {!rows.length && !loading && <tr><td className="td" colSpan={8}><Empty text="No employees" /></td></tr>}</tbody></table></div>
      <div className="space-y-3 md:hidden">{rows.map((r) => <div key={r.id} className="card p-4"><div className="flex justify-between"><div className="font-bold">{r.name}</div><StatusBadge s={r.status} /></div><div className="text-xs text-slate-500">{r.employeeId} · {r.verification || '-'}</div><div className="mt-2 grid grid-cols-3 text-sm"><span>In: {fmtTime(r.checkIn)}</span><span>Out: {fmtTime(r.checkOut)}</span><span>{fmtHM(r.workingMinutes)}</span></div></div>)}</div>
      {modal && <Modal wide title={{ late: 'Late Comers', present: 'Present', half: 'Half Day', absent: 'Absent' }[modal]!} onClose={() => setModal(null)}>
        {list(modal).length ? <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Name</th><th className="th">ID</th>{modal === 'late' ? <><th className="th">Check-in</th><th className="th">Minutes late</th></> : <><th className="th">Check-in</th><th className="th">Hours</th></>}</tr></thead>
          <tbody>{list(modal).map((r) => <tr key={r.id}><td className="td font-semibold">{r.name}</td><td className="td">{r.employeeId}</td><td className="td">{fmtTime(r.checkIn)}</td><td className="td">{modal === 'late' ? r.minutesLate : fmtHM(r.workingMinutes)}</td></tr>)}</tbody></table></div> : <Empty text="Nobody in this list" />}</Modal>}
      {manual && <ReasonModal title={`Manual ${manual.type === 'checkin' ? 'check-in' : 'check-out'} — ${manual.r.name}`} onClose={() => setManual(null)} onSubmit={async (reason: string) => { await api.post('/attendance/manual', { employeeId: manual.r.id, type: manual.type, reason }); toast('Recorded (audit logged)'); setManual(null); reload(); }} />}
      {fix && <CorrectModal r={fix} onClose={() => setFix(null)} onDone={() => { setFix(null); reload(); }} />}
      {data && <div style={{ position: 'fixed', left: -12000, top: 0 }} aria-hidden><AttendancePng ref={png} mode="daily" title={`Attendance — ${fmtDate(data.date)}`} subtitle="Daily attendance report" data={data} /></div>}
    </div>
  );
}
function ReasonModal({ title, onClose, onSubmit }: any) {
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  return <Modal title={title} onClose={onClose}><p className="mb-2 text-sm text-slate-600">Use only when face verification fails. A reason is required and is audit logged.</p><textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (min 5 characters)" />
    <div className="mt-3 flex justify-end gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || reason.trim().length < 5} onClick={async () => { setBusy(true); try { await onSubmit(reason.trim()); } catch (e) { toast(errMsg(e), 'err'); setBusy(false); } }}>Confirm</button></div></Modal>;
}
const toLocalInput = (iso?: string) => { if (!iso) return ''; const d = new Date(new Date(iso).getTime() + 5.5 * 3600000); return d.toISOString().slice(0, 16); }; // IST display
const fromLocalInput = (s: string) => (s ? new Date(new Date(s + ':00Z').getTime() - 5.5 * 3600000).toISOString() : null);
function CorrectModal({ r, onClose, onDone }: any) {
  const [ci, setCi] = useState(toLocalInput(r.checkIn)); const [co, setCo] = useState(toLocalInput(r.checkOut)); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await api.patch(`/attendance/${r.attendanceId}/correct`, { checkIn: fromLocalInput(ci), checkOut: fromLocalInput(co), reason }); toast('Correction saved (audit logged)'); onDone(); } catch (e) { toast(errMsg(e), 'err'); setBusy(false); } };
  return <Modal title={`Correct attendance — ${r.name}`} onClose={onClose}><p className="mb-2 text-xs text-slate-500">Times are in IST.</p><label className="label">Check-in</label><input type="datetime-local" className="input" value={ci} onChange={(e) => setCi(e.target.value)} /><label className="label mt-2">Check-out</label><input type="datetime-local" className="input" value={co} onChange={(e) => setCo(e.target.value)} />
    <label className="label mt-2">Reason</label><textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /><div className="mt-3 flex justify-end gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || reason.trim().length < 5} onClick={save}>Save</button></div></Modal>;
}
