import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAward, FiCalendar, FiCheckCircle, FiClock, FiDollarSign, FiDownload, FiEdit2, FiPlus, FiRefreshCw, FiSave, FiTarget, FiTrash2, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { api, errMsg } from '../../api';
import { Confirm, Empty, ErrorBox, Modal, Skeleton, toast } from '../../components/ui';
import { addDays, fmtDate, fmtTime, inr, pct } from '../../utils/format';
import { downloadPng } from '../../utils/exportPng';

type Payment = { id: string; amount: number; countedAmount: number; recordedAt: string };
type DailyEntry = { date: string; enteredAmount?: number; achieved: number; recordedAt: string; payments: Payment[] };
type Team = { id: string; leaderName: string; members: string[]; weeklyTarget: number; status: 'active' | 'draft'; dailyEntries: DailyEntry[]; createdAt: string };
type TeamFormValue = Pick<Team, 'leaderName' | 'members' | 'weeklyTarget'>;
type RangePreset = 'today' | 'monthToDate' | 'week' | 'month' | 'overall' | 'custom';
type DateRange = { from: string; to: string };

const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const isWorkday = (date: string) => ![0, 3].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
const clampToday = (date: string, today: string) => date > today ? today : date;
const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`;
const weekStart = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
};
const createdDate = (team: Team) => new Date(team.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

function rangeFor(preset: RangePreset, today: string, team?: Team, custom?: DateRange): DateRange {
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'monthToDate') return { from: firstOfMonth(today), to: today };
  if (preset === 'week') return { from: weekStart(today), to: today };
  if (preset === 'month') return { from: firstOfMonth(today), to: today };
  if (preset === 'overall') return { from: team ? createdDate(team) : firstOfMonth(today), to: today };
  return custom && custom.from && custom.to && custom.from <= custom.to ? custom : { from: today, to: today };
}

function workdaysBetween(range: DateRange, team: Team, today: string) {
  const from = range.from > createdDate(team) ? range.from : createdDate(team);
  const to = clampToday(range.to, today);
  if (!from || !to || from > to) return 0;
  let count = 0;
  for (let date = from; date <= to; date = addDays(date, 1)) if (isWorkday(date)) count += 1;
  return count;
}

function teamTotals(team: Team, range: DateRange, today: string) {
  const target = workdaysBetween(range, team, today) * team.weeklyTarget / 5;
  const achieved = team.dailyEntries.reduce((sum, entry) => sum + (entry.date >= range.from && entry.date <= range.to && entry.date <= today ? entry.achieved : 0), 0);
  const percent = target ? achieved / target * 100 : 0;
  return { target, achieved, remaining: Math.max(target - achieved, 0), percent };
}

function TeamForm({ initial, onSave, onClose, busy }: {
  initial?: Team;
  onSave: (value: TeamFormValue, status: 'active' | 'draft') => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [leaderName, setLeaderName] = useState(initial?.leaderName || '');
  const [members, setMembers] = useState(initial?.members || ['']);
  const [weeklyTarget, setWeeklyTarget] = useState(initial?.weeklyTarget ? String(initial.weeklyTarget) : '');
  const save = async (event: FormEvent, status: 'active' | 'draft') => {
    event.preventDefault();
    const cleanMembers = members.map((name) => name.trim()).filter(Boolean);
    if (!leaderName.trim() || !cleanMembers.length || Number(weeklyTarget) <= 0) {
      toast('Enter a team leader, at least one member, and a weekly target greater than zero.', 'err');
      return;
    }
    if (new Set(cleanMembers.map((name) => name.toLowerCase())).size !== cleanMembers.length) {
      toast('Team member names must be unique.', 'err');
      return;
    }
    await onSave({ leaderName: leaderName.trim(), members: cleanMembers, weeklyTarget: Number(weeklyTarget) }, status);
  };
  return (
    <form className="space-y-4" onSubmit={(event) => save(event, 'active')}>
      <div><label className="label">Team Leader Name</label><input autoFocus className="input" maxLength={100} value={leaderName} onChange={(e) => setLeaderName(e.target.value)} placeholder="Enter team leader name" /></div>
      <div>
        <div className="mb-2 flex items-center justify-between"><label className="label !mb-0">Team Members</label><button type="button" className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs" onClick={() => setMembers((items) => [...items, ''])}><FiPlus /> Add member</button></div>
        <div className="space-y-2">{members.map((member, index) => <div key={index} className="flex gap-2"><input className="input" maxLength={100} aria-label={`Member ${index + 1} name`} placeholder={`Member ${index + 1} name`} value={member} onChange={(e) => setMembers((items) => items.map((item, i) => i === index ? e.target.value : item))} />{members.length > 1 && <button type="button" title="Remove member" aria-label="Remove member" className="btn btn-ghost !px-3 text-red-600" onClick={() => setMembers((items) => items.filter((_, i) => i !== index))}><FiTrash2 /></button>}</div>)}</div>
      </div>
      <div>
        <label className="label">Weekly Team Target (₹)</label>
        <input className="input" type="number" inputMode="numeric" min="1" step="1" max="1000000000" value={weeklyTarget} onChange={(e) => setWeeklyTarget(e.target.value)} placeholder="e.g. 300000" />
        <p className="mt-1 text-xs text-slate-500">Split equally across Monday, Tuesday, Thursday, Friday, and Saturday. Daily target: {inr(Number(weeklyTarget || 0) / 5)}.</p>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        {!initial && <button type="button" disabled={busy} className="btn btn-ghost" onClick={(event) => save(event, 'draft')}><FiSave /> Save draft</button>}
        <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : initial ? 'Save changes' : 'Create team'}</button>
      </div>
    </form>
  );
}

function ReportTable({ teams, range, title }: { teams: Team[]; range: DateRange; title: string }) {
  const today = todayKey();
  const rows = teams.map((team) => ({ team, totals: teamTotals(team, range, today) }));
  const sum = (key: 'target' | 'achieved' | 'remaining') => rows.reduce((total, row) => total + row.totals[key], 0);
  const overallPercent = sum('target') ? sum('achieved') / sum('target') * 100 : 0;
  return (
    <div className="w-[900px] bg-white p-10 text-slate-900">
      <div className="border-b-4 border-crimson-600 pb-5">
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-crimson-700">Growthora · Team Performance</div>
        <h2 className="mt-2 text-3xl font-extrabold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{fmtDate(range.from)} – {fmtDate(range.to)} · Generated {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
      </div>
      <div className="my-6 grid grid-cols-4 gap-3">
        {[['Target', sum('target')], ['Archived', sum('achieved')], ['Remaining', sum('remaining')], ['Achievement', overallPercent]].map(([label, amount]) => (
          <div key={String(label)} className="rounded-lg bg-slate-50 p-4"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-xl font-extrabold">{label === 'Achievement' ? `${Number(amount).toFixed(1)}%` : inr(Number(amount))}</div></div>
        ))}
      </div>
      <table className="w-full border-collapse text-sm">
        <thead><tr className="bg-crimson-50 text-left">{['Team Leader', 'Team Members', 'Target', 'Archived', 'Remaining', 'Achievement'].map((heading) => <th key={heading} className="border-b border-crimson-200 px-3 py-3 text-xs font-bold uppercase text-slate-600">{heading}</th>)}</tr></thead>
        <tbody>{rows.map(({ team, totals }) => <tr key={team.id} className="border-b border-slate-100 align-top">
          <td className="px-3 py-3 font-bold">{team.leaderName}{team.status === 'draft' ? ' · Draft' : ''}</td>
          <td className="px-3 py-3">{team.members.join(', ')}</td>
          <td className="px-3 py-3">{inr(totals.target)}</td><td className="px-3 py-3 font-semibold">{inr(totals.achieved)}</td><td className="px-3 py-3">{inr(totals.remaining)}</td>
          <td className={`px-3 py-3 font-bold ${totals.percent >= 100 ? 'text-emerald-700' : 'text-crimson-700'}`}>{pct(totals.percent)}</td>
        </tr>)}</tbody>
      </table>
      <p className="mt-6 text-xs text-slate-400">Daily target is weekly target ÷ 5 (Monday, Tuesday, Thursday, Friday, Saturday). Percentages can exceed 100%.</p>
    </div>
  );
}

export default function Teamtarget() {
  const today = todayKey();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);
  const [teamPreset, setTeamPreset] = useState<RangePreset>('today');
  const [teamCustom, setTeamCustom] = useState<DateRange>({ from: today, to: today });
  const [entryDate, setEntryDate] = useState(today);
  const [entryValue, setEntryValue] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [reportRange, setReportRange] = useState<DateRange>({ from: today, to: today });
  const [exporting, setExporting] = useState<'team' | 'all' | null>(null);
  const [deletePayment, setDeletePayment] = useState<{ payment: Payment; date: string } | null>(null);
  const teamPng = useRef<HTMLDivElement>(null);
  const allPng = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/teams');
      setTeams(data.items);
      setSelectedId((current) => current && data.items.some((team: Team) => team.id === current) ? current : data.items[0]?.id || '');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const selected = teams.find((team) => team.id === selectedId);
  const selectedRange = rangeFor(teamPreset, today, selected, teamCustom);
  const selectedTotals = selected ? teamTotals(selected, selectedRange, today) : null;
  const todayRange = { from: today, to: today };
  const activeTeams = teams.filter((team) => team.status === 'active');
  const todayArchived = activeTeams.reduce((sum, team) => sum + (team.dailyEntries.find((entry) => entry.date === today)?.achieved || 0), 0);
  const currentWeekRange = { from: weekStart(today), to: today };
  const weeklyTotals = activeTeams.reduce((totals, team) => {
    const current = teamTotals(team, currentWeekRange, today);
    return { target: totals.target + current.target, achieved: totals.achieved + current.achieved };
  }, { target: 0, achieved: 0 });
  const topTeam = activeTeams.map((team) => ({ team, totals: teamTotals(team, currentWeekRange, today) })).sort((a, b) => b.totals.percent - a.totals.percent)[0];
  const selectedEntry = selected?.dailyEntries.find((entry) => entry.date === entryDate);

  useEffect(() => {
    setEntryValue('');
    setEditingPaymentId(null);
  }, [selectedId, entryDate]);

  const saveTeam = async (value: TeamFormValue, status: 'active' | 'draft') => {
    setBusy(true);
    try {
      if (formMode === 'edit' && selected) {
        await api.put(`/teams/${selected.id}`, { ...value, status: selected.status });
        toast('Team updated');
      } else {
        const { data } = await api.post('/teams', { ...value, status });
        setSelectedId(data.team.id);
        toast(status === 'draft' ? 'Team draft saved' : 'Team created');
      }
      setFormMode(null);
      await reload();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  };

  const toggleDraft = async (team: Team) => {
    setBusy(true);
    try {
      await api.put(`/teams/${team.id}`, { leaderName: team.leaderName, members: team.members, weeklyTarget: team.weeklyTarget, status: team.status === 'draft' ? 'active' : 'draft' });
      toast(team.status === 'draft' ? 'Team published' : 'Team moved to drafts');
      await reload();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  };

  const removeTeam = async () => {
    if (!deleteTeam) return;
    setBusy(true);
    try {
      await api.delete(`/teams/${deleteTeam.id}`);
      if (selectedId === deleteTeam.id) setSelectedId('');
      setDeleteTeam(null);
      toast('Team deleted');
      await reload();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  };

  const saveDailyPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !isWorkday(entryDate) || entryDate > today || entryValue === '') return;
    const amount = Number(entryValue);
    if (!Number.isInteger(amount) || amount < 0 || amount > 1000000000) {
      toast('Enter a valid payment amount (zero or more).', 'err');
      return;
    }
    setBusy(true);
    try {
      if (editingPaymentId) {
        await api.put(`/teams/${selected.id}/daily-target/${entryDate}/payments/${editingPaymentId}`, { amount });
        toast('Payment updated');
      } else {
        await api.post(`/teams/${selected.id}/daily-target/payments`, { date: entryDate, amount });
        toast('Payment added');
      }
      setEntryValue('');
      setEditingPaymentId(null);
      await reload();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  };

  const removePayment = async () => {
    if (!selected || !deletePayment) return;
    setBusy(true);
    try {
      await api.delete(`/teams/${selected.id}/daily-target/${deletePayment.date}/payments/${deletePayment.payment.id}`);
      setDeletePayment(null);
      if (editingPaymentId === deletePayment.payment.id) {
        setEditingPaymentId(null);
        setEntryValue('');
      }
      toast('Payment deleted');
      await reload();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  };

  const exportPng = async (kind: 'team' | 'all', range?: DateRange) => {
    const node = kind === 'team' ? teamPng.current : allPng.current;
    if (!node) return;
    setExporting(kind);
    try {
      if (range) setReportRange(range);
      if (range) await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const exportRange = kind === 'team' ? selectedRange : range || reportRange;
      await downloadPng(node, `${kind === 'team' ? selected?.leaderName || 'Team' : 'Team-Leader-Report'}-${exportRange.from}_${exportRange.to}.png`);
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setExporting(null);
    }
  };

  const reportTeams = useMemo(() => teams, [teams]);
  const statCards = [
    { label: "Today's total payments", value: inr(todayArchived), icon: FiDollarSign, detail: 'Payments recorded today' },
    { label: 'Teams total', value: teams.length, icon: FiUsers, detail: `${activeTeams.length} active · ${teams.length - activeTeams.length} draft` },
    { label: 'Target total', value: inr(weeklyTotals.target), icon: FiTarget, detail: 'This week · active teams' },
    { label: 'Archived total', value: inr(weeklyTotals.achieved), icon: FiCheckCircle, detail: 'This week · active teams' },
    { label: 'Remaining payment', value: inr(Math.max(weeklyTotals.target - weeklyTotals.achieved, 0)), icon: FiTrendingUp, detail: 'This week · active teams' },
    { label: 'Top team this week', value: topTeam ? topTeam.team.leaderName : '—', icon: FiAward, detail: topTeam ? `${pct(topTeam.totals.percent)} achieved` : 'No active teams' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-extrabold">Team Leader Target</h1><p className="mt-1 text-sm text-slate-500">Set team goals, record daily payments, and track progress in real time.</p></div>
        <div className="flex flex-wrap gap-2"><button className="btn btn-ghost" onClick={() => void exportPng('all', todayRange)} disabled={!teams.length || !!exporting}><FiDownload /> {exporting === 'all' ? 'Preparing…' : "Today's report"}</button><button className="btn btn-primary" onClick={() => setFormMode('create')}><FiPlus /> Create Team Leader</button></div>
      </div>

      {error && <ErrorBox text={error} onRetry={() => void reload()} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map(({ label, value, icon: Icon, detail }) => <div className="card min-w-0 p-3 sm:p-4" key={label}>
          <div className="flex items-start justify-between gap-2"><div className="text-xs font-semibold text-slate-500">{label}</div><Icon className="shrink-0 text-crimson-600" size={18} /></div>
          <div className="mt-2 truncate text-lg font-extrabold sm:text-xl" title={String(value)}>{value}</div><div className="mt-1 truncate text-[11px] text-slate-400">{detail}</div>
        </div>)}
      </div>

      <section className="card p-3 sm:p-4">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div><h2 className="font-bold">Download team report</h2><p className="text-xs text-slate-500">Choose a date range for the all-team PNG report.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <label className="text-xs font-semibold text-slate-500">From<input className="input mt-1" type="date" max={today} value={reportRange.from} onChange={(e) => setReportRange((range) => ({ ...range, from: e.target.value }))} /></label>
            <label className="text-xs font-semibold text-slate-500">To<input className="input mt-1" type="date" max={today} min={reportRange.from || undefined} value={reportRange.to} onChange={(e) => setReportRange((range) => ({ ...range, to: e.target.value }))} /></label>
            <button className="btn btn-primary col-span-2 self-end sm:col-span-1" disabled={!teams.length || !!exporting || !reportRange.from || !reportRange.to || reportRange.from > reportRange.to} onClick={() => void exportPng('all')}><FiDownload /> {exporting === 'all' ? 'Preparing…' : 'Download PNG'}</button>
          </div>
        </div>
        <p className="text-xs text-slate-500">Report range: {reportRange.from ? fmtDate(reportRange.from) : '—'} to {reportRange.to ? fmtDate(reportRange.to) : '—'}.</p>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]">
        <section className="card min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="font-bold">Your teams</h2><p className="text-xs text-slate-500">{teams.length} teams</p></div><button title="Refresh teams" aria-label="Refresh teams" className="btn btn-ghost !min-h-[38px] !px-3" onClick={() => void reload()}><FiRefreshCw /></button></div>
          <div className="max-h-[720px] space-y-2 overflow-y-auto p-3">
            {loading && !teams.length ? Array.from({ length: 3 }).map((_, index) => <div className="card p-4" key={index}><Skeleton className="mb-3 h-4 w-32" /><Skeleton className="h-4 w-24" /></div>)
              : teams.length ? teams.map((team) => <article key={team.id} onClick={() => setSelectedId(team.id)} className={`cursor-pointer rounded-xl border p-3 transition ${selectedId === team.id ? 'border-crimson-500 bg-crimson-50/60 shadow-sm' : 'border-slate-200 hover:border-crimson-300'}`}>
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate font-bold">{team.leaderName}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${team.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{team.status}</span></div><p className="mt-1 truncate text-xs text-slate-500">{team.members.join(' · ')}</p></div><FiUsers className="mt-1 shrink-0 text-crimson-600" /></div>
                <div className="mt-3 flex items-center justify-between text-xs"><span className="text-slate-500">Weekly target</span><span className="font-bold">{inr(team.weeklyTarget)}</span></div>
                <div className="mt-3 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                  <button className="btn btn-ghost !min-h-[34px] !px-2.5 !py-1 text-xs" onClick={() => { setSelectedId(team.id); setFormMode('edit'); }}><FiEdit2 /> Edit</button>
                  <button disabled={busy} className="btn btn-ghost !min-h-[34px] !px-2.5 !py-1 text-xs" onClick={() => void toggleDraft(team)}>{team.status === 'draft' ? 'Publish' : 'Move to draft'}</button>
                  <button className="btn btn-ghost !min-h-[34px] !px-2.5 !py-1 text-xs text-red-600" onClick={() => setDeleteTeam(team)}><FiTrash2 /> Delete</button>
                </div>
              </article>) : <Empty text="No teams yet. Create your first team leader." />}
          </div>
        </section>

        <section className="card min-w-0 overflow-hidden">
          {!selected ? <div className="p-8"><Empty text={loading ? 'Loading team details…' : 'Select a team to see its target and progress.'} /></div> : <>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{selected.leaderName}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${selected.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{selected.status}</span></div><p className="mt-1 text-sm text-slate-500">{selected.members.join(' · ')}</p></div>
              <button className="btn btn-ghost shrink-0" disabled={!!exporting} onClick={() => void exportPng('team')}><FiDownload /> {exporting === 'team' ? 'Preparing…' : 'Team PNG'}</button>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                {([
                  ['today', 'Today'], ['monthToDate', 'Till today'], ['week', 'This week'], ['month', 'This month'], ['overall', 'Overall'], ['custom', 'Date range'],
                ] as [RangePreset, string][]).map(([preset, label]) => <button key={preset} onClick={() => setTeamPreset(preset)} className={`rounded-full px-3 py-2 text-xs font-semibold ${teamPreset === preset ? 'bg-crimson-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}
              </div>
              {teamPreset === 'custom' && <div className="grid grid-cols-2 gap-2 sm:max-w-md"><label className="label">From<input className="input mt-1" type="date" max={today} value={teamCustom.from} onChange={(e) => setTeamCustom((range) => ({ ...range, from: e.target.value }))} /></label><label className="label">To<input className="input mt-1" type="date" max={today} min={teamCustom.from || undefined} value={teamCustom.to} onChange={(e) => setTeamCustom((range) => ({ ...range, to: e.target.value }))} /></label></div>}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ['Target', selectedTotals ? inr(selectedTotals.target) : '—', FiTarget],
                  ['Archived', selectedTotals ? inr(selectedTotals.achieved) : '—', FiCheckCircle],
                  ['Remaining', selectedTotals ? inr(selectedTotals.remaining) : '—', FiDollarSign],
                  ['Achievement', selectedTotals ? pct(selectedTotals.percent) : '—', FiTrendingUp],
                ].map(([label, value, Icon]: any) => <div key={label} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Icon className="text-crimson-600" />{label}</div><div className={`mt-2 break-words text-lg font-extrabold ${label === 'Achievement' && selectedTotals && selectedTotals.percent >= 100 ? 'text-emerald-700' : ''}`}>{value}</div></div>)}
              </div>
              <div className="rounded-xl border border-crimson-100 bg-crimson-50/40 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">Enter today’s target achievement</h3><p className="text-xs text-slate-500">Add each payment as it arrives. Every payment is saved with its own timestamp.</p></div><div className="text-sm font-bold text-crimson-700">Daily target: {inr(selected.weeklyTarget / 5)}</div></div>
                <form onSubmit={saveDailyPayment} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
                  <label className="label">Date<input className="input mt-1" type="date" max={today} value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></label>
                  <label className="label">Payment received (₹)<input className="input mt-1" type="number" inputMode="numeric" min="0" step="1" max="1000000000" value={entryValue} onChange={(e) => setEntryValue(e.target.value)} placeholder="Enter payment amount" /></label>
                  <div className="flex gap-2 self-end"><button className="btn btn-primary flex-1" type="submit" disabled={busy || !isWorkday(entryDate) || entryDate > today || entryValue === ''}><FiSave /> {busy ? 'Saving…' : editingPaymentId ? 'Save edit' : 'Add payment'}</button>{editingPaymentId && <button className="btn btn-ghost" type="button" onClick={() => { setEditingPaymentId(null); setEntryValue(''); }}>Cancel</button>}</div>
                </form>
                {entryValue !== '' && Number.isInteger(Number(entryValue)) && Number(entryValue) >= 0 && <p className="mt-2 text-xs font-semibold text-slate-600">Amount counted toward target: {inr(Math.round(Number(entryValue) * 82 / 100))}</p>}
                {!isWorkday(entryDate) && <p className="mt-2 text-xs font-semibold text-amber-700">Team targets are scheduled Monday, Tuesday, Thursday, Friday, and Saturday.</p>}
                <div className="mt-4 border-t border-crimson-100 pt-3">
                  <div className="mb-2 flex items-center justify-between gap-2"><h4 className="text-sm font-bold">Payments for {fmtDate(entryDate)}</h4><span className="text-xs font-semibold text-slate-500">{selectedEntry?.payments.length || 0} entered · {inr(selectedEntry?.achieved || 0)} counted</span></div>
                  {selectedEntry?.payments.length ? <div className="space-y-2">{selectedEntry.payments.slice().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><span>Payment: <strong>{inr(payment.amount)}</strong></span><span className="text-emerald-700">Counted: <strong>{inr(payment.countedAmount)}</strong></span></div><div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><FiClock /> {fmtTime(payment.recordedAt)}</div></div>
                    <div className="flex gap-2"><button type="button" className="btn btn-ghost !min-h-[36px] !px-3 text-xs" onClick={() => { setEditingPaymentId(payment.id); setEntryValue(String(payment.amount)); }}><FiEdit2 /> Edit</button><button type="button" title="Delete payment" aria-label="Delete payment" className="btn btn-ghost !min-h-[36px] !px-3 text-red-600" onClick={() => setDeletePayment({ payment, date: entryDate })}><FiTrash2 /></button></div>
                  </div>)}</div> : <p className="rounded-lg bg-white p-3 text-sm text-slate-500">No payments entered for this date yet.</p>}
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-bold">Daily target vs archived</h3>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full min-w-[560px]"><thead><tr>{['Date', 'Target', 'Archived', 'Remaining', 'Achievement', 'Last saved'].map((heading) => <th key={heading} className="th">{heading}</th>)}</tr></thead>
                    <tbody>{selected.dailyEntries.filter((entry) => entry.date >= selectedRange.from && entry.date <= selectedRange.to).sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
                      const achieved = entry.achieved;
                      const target = selected.weeklyTarget / 5;
                      const percent = target ? achieved / target * 100 : 0;
                      return <tr key={entry.date}><td className="td whitespace-nowrap">{fmtDate(entry.date)}</td><td className="td">{inr(target)}</td><td className="td font-semibold">{inr(achieved)}</td><td className="td">{inr(Math.max(target - achieved, 0))}</td><td className={`td font-bold ${percent >= 100 ? 'text-emerald-700' : ''}`}>{pct(percent)}</td><td className="td whitespace-nowrap text-xs text-slate-500">{fmtTime(entry.recordedAt)}</td></tr>;
                    })}{!selected.dailyEntries.some((entry) => entry.date >= selectedRange.from && entry.date <= selectedRange.to) && <tr><td className="td" colSpan={6}><Empty text="No daily achievements recorded for this range." /></td></tr>}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </>}
        </section>
      </div>

      {formMode && <Modal wide title={formMode === 'edit' ? `Edit ${selected?.leaderName || 'team'}` : 'Create Team Leader'} onClose={() => setFormMode(null)}><TeamForm initial={formMode === 'edit' ? selected : undefined} onSave={saveTeam} onClose={() => setFormMode(null)} busy={busy} /></Modal>}
      {deleteTeam && <Confirm busy={busy} title="Delete team?" text={`Delete ${deleteTeam.leaderName} and its daily achievement history? This cannot be undone.`} onNo={() => setDeleteTeam(null)} onYes={() => void removeTeam()} />}
      {deletePayment && <Confirm busy={busy} title="Delete payment?" text={`Delete the ${inr(deletePayment.payment.amount)} payment entered for ${fmtDate(deletePayment.date)}? Team totals will be recalculated.`} onNo={() => setDeletePayment(null)} onYes={() => void removePayment()} />}

      <div aria-hidden className="pointer-events-none fixed left-[-12000px] top-0">
        {selected && <div ref={teamPng}><ReportTable teams={[selected]} range={selectedRange} title={`${selected.leaderName} · Team Report`} /></div>}
        <div ref={allPng}><ReportTable teams={reportTeams} range={reportRange} title="All Team Leaders · Target Report" /></div>
      </div>
    </div>
  );
}
