import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSun, FiMoon, FiCheckCircle, FiX } from 'react-icons/fi';
import { api, errMsg } from '../../api';
import { useFetch } from '../../components/useFetch';
import { Combo, ErrorBox, Skeleton, toast, parseLeads, parsePayment } from '../../components/ui';
import { talkOptions, leadOptions, payOptions, fmtMinutes, pct, inr, payCell } from '../../utils/format';

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
export default function Sprint() {
  const { data, loading, error, reload } = useFetch('/sprints/eligibility');
  const [open, setOpen] = useState<'morning' | 'evening' | null>(null);
  const [talk, setTalk] = useState<string | null>(null); const [leads, setLeads] = useState<string | null>(null); const [pay, setPay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState<any>(null); const nav = useNavigate();
  const reset = () => { setTalk(null); setLeads(null); setPay(null); };
  const submit = async () => {
    if (!open) return;
    if (talk == null || leads == null || pay == null) { toast('Please fill Talk Time, Leads and Payments', 'err'); return; }
    setBusy(true);
    try {
      const body: any = { session: open, talkTimeMinutes: Number(talk), leads: Number(leads), paymentStatus: pay === 'nc' ? 'not_confirm' : 'confirmed' };
      if (pay !== 'nc') body.paymentAmount = Number(pay);
      const { data: r } = await api.post('/sprints/submit', body);
      toast(r.message); const was = open; setOpen(null); reset(); await reload(); if (was === 'evening') setDone(r);
    } catch (e) { toast(errMsg(e), 'err'); reload(); } finally { setBusy(false); }
  };
  if (loading && !data) return <Skeleton className="h-40 w-full" />;
  if (error) return <ErrorBox text={error} onRetry={reload} />;
  const m = data.morning, e = data.evening;
  const Summary = ({ x }: any) => <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-sm"><div><div className="text-xs text-slate-500">Talk time</div>{fmtMinutes(x.talkTimeMinutes)}</div><div><div className="text-xs text-slate-500">Leads</div>{x.leads}</div><div><div className="text-xs text-slate-500">Payments</div>{payCell(x)}</div><div className="col-span-3 text-xs text-slate-500">Submitted {when(x.submittedAt)}</div></div>;
  const perf = (done?.performance) || (m && e ? data.performance : null);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Update Sprint / Projection <span className="text-sm font-normal text-slate-500">· {data.dateKey}</span></h1>
      <div className="card p-4"><div className="flex items-center gap-2 font-bold"><FiSun className="text-amber-500" /> Morning Sprint <span className="text-xs font-normal text-slate-500">(what you plan / commit to achieve today)</span></div>
        {m ? <><div className="mt-1 flex items-center gap-1 text-sm text-emerald-700"><FiCheckCircle /> Submitted</div><Summary x={m} /></> : <button className="btn btn-primary mt-3 w-full" disabled={!data.canMorning} onClick={() => { reset(); setOpen('morning'); }}>Submit Morning Sprint</button>}</div>
      <div className="card p-4"><div className="flex items-center gap-2 font-bold"><FiMoon className="text-indigo-500" /> Evening Sprint <span className="text-xs font-normal text-slate-500">(what you actually achieved today)</span></div>
        {e ? <><div className="mt-1 flex items-center gap-1 text-sm text-emerald-700"><FiCheckCircle /> Submitted</div><Summary x={e} /></> : <button className="btn btn-primary mt-3 w-full" disabled={!data.canEvening} onClick={() => { reset(); setOpen('evening'); }}>{data.canEvening ? 'Submit Evening Sprint' : 'Submit morning sprint first'}</button>}</div>
      {m && e && <div className="rounded-lg bg-slate-100 p-3 text-center text-sm">Both sprints done for today. Morning reopens from 8:00 AM the next day.</div>}
      {open && <div className="card space-y-3 border-crimson-500 p-4">
        <div className="flex items-center justify-between"><h2 className="font-bold capitalize">{open} sprint {open === 'morning' ? '— projection' : '— achieved'}</h2><button onClick={() => setOpen(null)} aria-label="Cancel"><FiX /></button></div>
        <div><label className="label">Talk time</label><Combo options={talkOptions} value={talk} onChange={setTalk} placeholder="Search e.g. 1 hour 10 min" /></div>
        <div><label className="label">Leads / Documentation</label><Combo options={leadOptions} value={leads} onChange={setLeads} inputMode="numeric" placeholder="0–50, or type a larger number" parseCustom={parseLeads} /></div>
        <div><label className="label">Payments</label><Combo options={payOptions} value={pay} onChange={setPay} inputMode="text" placeholder="Search or type amount e.g. 7500" parseCustom={parsePayment} /></div>
        <p className="text-xs text-slate-500">“Not Confirm” is not counted as collected money. Submitted records cannot be edited.</p>
        <button className="btn btn-primary w-full" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : `Submit ${open} sprint`}</button></div>}
      {perf && done && <div className="card border-emerald-500 p-5 text-center"><div className="text-sm text-slate-500">Today's performance</div>
        <div className="text-4xl font-extrabold text-crimson-700">{perf.performance != null ? pct(perf.performance) : perf.status}</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm"><div><div className="text-xs text-slate-500">Talk time</div>{fmtMinutes(perf.achieved.talk)}</div><div><div className="text-xs text-slate-500">Leads</div>{perf.achieved.leads}</div><div><div className="text-xs text-slate-500">Payments</div>{inr(perf.achieved.pay)}</div></div>
        {perf.pendingPayment && <div className="mt-2 text-xs text-orange-600">Evening payment is Not Confirm — it is not counted as collected.</div>}
        <button className="btn btn-primary mt-4" onClick={() => nav('/app')}>Close</button></div>}
      {perf && !done && <div className="card p-4 text-center"><div className="text-sm text-slate-500">Today's performance</div><div className="text-2xl font-extrabold text-crimson-700">{perf.performance != null ? pct(perf.performance) : perf.status}</div></div>}
    </div>
  );
}
