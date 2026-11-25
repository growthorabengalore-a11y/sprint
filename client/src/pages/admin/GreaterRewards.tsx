import { FormEvent, useMemo, useRef, useState } from 'react';
import { FiAward, FiDollarSign, FiDownload, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { api, errMsg } from '../../api';
import { Confirm, Empty, ErrorBox, Modal, Skeleton, toast } from '../../components/ui';
import { useFetch } from '../../components/useFetch';
import { downloadPng } from '../../utils/exportPng';
import { fmtDate, inr } from '../../utils/format';
import GreaterRewardsPng from '../../reports/GreaterRewardsPng';

type Member = { id: string; name: string; designation: string; archived: number };
type EditableMember = Pick<Member, 'id' | 'name' | 'designation'>;
type Team = {
  id: string;
  teamName: string;
  weeklyTarget: number;
  targetForPeriod: number | null;
  archived: number;
  performance: number | null;
  members: Member[];
};
type DateRange = { from: string; to: string };

const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const initialRange = (): DateRange => {
  const today = todayKey();
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return { from: date.toISOString().slice(0, 10), to: today };
};

function TeamForm({ initial, busy, onClose, onSave }: {
  initial?: Pick<Team, 'id' | 'teamName' | 'weeklyTarget'>;
  busy: boolean;
  onClose: () => void;
  onSave: (teamName: string, weeklyTarget: number) => Promise<void>;
}) {
  const [teamName, setTeamName] = useState(initial?.teamName || '');
  const [weeklyTarget, setWeeklyTarget] = useState(initial ? String(initial.weeklyTarget) : '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(teamName.trim(), Number(weeklyTarget));
  };
  return <Modal title={initial ? 'Edit Team' : 'Create a Team'} onClose={onClose}>
    <form className="space-y-4" onSubmit={submit}>
      <div><label className="label" htmlFor="rewards-team-name">Team name</label><input id="rewards-team-name" autoFocus required maxLength={100} className="input" value={teamName} onChange={(event) => setTeamName(event.target.value)} /></div>
      <div><label className="label" htmlFor="rewards-weekly-target">Per-week closure requirement (₹)</label><input id="rewards-weekly-target" type="number" min={1} max={1000000000} step={1} required className="input" value={weeklyTarget} onChange={(event) => setWeeklyTarget(event.target.value)} /></div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create team'}</button></div>
    </form>
  </Modal>;
}

function MemberForm({ initial, teamName, busy, onClose, onSave }: {
  initial?: EditableMember;
  teamName: string;
  busy: boolean;
  onClose: () => void;
  onSave: (name: string, designation: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [designation, setDesignation] = useState(initial?.designation || '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(name.trim(), designation.trim());
  };
  return <Modal title={`${initial ? 'Edit Team Member' : 'Add Team Member'} · ${teamName}`} onClose={onClose}>
    <form className="space-y-4" onSubmit={submit}>
      <div><label className="label" htmlFor="rewards-member-name">Name</label><input id="rewards-member-name" autoFocus required maxLength={100} className="input" value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div><label className="label" htmlFor="rewards-member-designation">Designation</label><input id="rewards-member-designation" required maxLength={100} className="input" value={designation} onChange={(event) => setDesignation(event.target.value)} /></div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Add member'}</button></div>
    </form>
  </Modal>;
}

function PaymentForm({ memberName, busy, onClose, onSave }: {
  memberName: string;
  busy: boolean;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(Number(amount));
  };
  return <Modal title={`Enter closure payment · ${memberName}`} onClose={onClose}>
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-slate-500">This amount will be added to the member’s archived total for today.</p>
      <div><label className="label" htmlFor="rewards-payment-amount">Amount closed (₹)</label><input id="rewards-payment-amount" autoFocus type="number" min={1} max={1000000000} step={1} required className="input" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add payment'}</button></div>
    </form>
  </Modal>;
}

export default function GreaterRewards() {
  const [range, setRange] = useState<DateRange>(initialRange);
  const [teamEditor, setTeamEditor] = useState<Team | null | false>(false);
  const [memberEditor, setMemberEditor] = useState<{ team: Team; member?: EditableMember } | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<{ team: Team; member: Member } | null>(null);
  const [addingPayment, setAddingPayment] = useState<{ team: Team; member: Member } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const reportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const validRange = !!range.from && !!range.to && range.from <= range.to;
  const { data, loading, error, reload } = useFetch<{ items: Team[] }>(validRange ? '/greater-rewards' : null, range);
  const teams = useMemo(() => validRange ? data?.items || [] : [], [data, validRange]);

  const saveTeam = async (teamName: string, weeklyTarget: number) => {
    setBusy(true);
    try {
      if (teamEditor) await api.put(`/greater-rewards/${teamEditor.id}`, { teamName, weeklyTarget });
      else await api.post('/greater-rewards', { teamName, weeklyTarget });
      setTeamEditor(false);
      toast(teamEditor ? 'Team updated.' : 'Team created.');
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };
  const saveMember = async (name: string, designation: string) => {
    if (!memberEditor) return;
    setBusy(true);
    try {
      if (memberEditor.member) {
        await api.put(`/greater-rewards/${memberEditor.team.id}/members/${memberEditor.member.id}`, { name, designation });
      } else {
        await api.post(`/greater-rewards/${memberEditor.team.id}/members`, { name, designation });
      }
      setMemberEditor(null);
      toast(memberEditor.member ? 'Team member updated.' : 'Team member added.');
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };
  const removeTeam = async () => {
    if (!teamToDelete) return;
    setBusy(true);
    try {
      await api.delete(`/greater-rewards/${teamToDelete.id}`);
      setTeamToDelete(null);
      toast('Team, members, and their payment history deleted.');
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };
  const removeMember = async () => {
    if (!memberToDelete) return;
    setBusy(true);
    try {
      await api.delete(`/greater-rewards/${memberToDelete.team.id}/members/${memberToDelete.member.id}`);
      setMemberToDelete(null);
      toast('Team member and their payment history deleted.');
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };
  const savePayment = async (amount: number) => {
    if (!addingPayment) return;
    setBusy(true);
    try {
      await api.post(`/greater-rewards/${addingPayment.team.id}/members/${addingPayment.member.id}/payments`, { amount });
      setAddingPayment(null);
      toast(`${inr(amount)} closure payment added.`);
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };
  const exportReport = async (team: Team) => {
    const node = reportRefs.current[team.id];
    if (!node || !validRange) return;
    setExportingId(team.id);
    try {
      await downloadPng(node, `Greater-Rewards-${team.teamName}-${range.from}-to-${range.to}.png`);
    } catch (exportError) {
      toast(errMsg(exportError), 'err');
    } finally {
      setExportingId(null);
    }
  };

  if (loading && !data) return <Skeleton className="h-40 w-full" />;
  if (error && !data) return <ErrorBox text={error} onRetry={reload} />;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><FiAward className="text-crimson-600" size={22} /><h1 className="text-2xl font-extrabold">Greater Rewards Plan</h1></div><p className="mt-1 text-sm text-slate-500">Track team weekly closure targets and each member’s accumulated closures.</p></div>
      <button type="button" className="btn btn-primary" onClick={() => setTeamEditor(null)}><FiPlus />Create a Team</button>
    </div>
    <section className="card grid gap-3 p-4 sm:grid-cols-2">
      <div><label className="label" htmlFor="rewards-from">From date</label><input id="rewards-from" type="date" max={todayKey()} className="input" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></div>
      <div><label className="label" htmlFor="rewards-to">To date</label><input id="rewards-to" type="date" min={range.from || undefined} max={todayKey()} className="input" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></div>
      {!validRange && <p className="text-sm text-red-600 sm:col-span-2">Select a valid From and To date range.</p>}
      {validRange && <p className="text-xs text-slate-500 sm:col-span-2">The weekly target is counted once for each Monday–Sunday week touched by the selected range.</p>}
    </section>
    {error && <ErrorBox text={error} onRetry={reload} />}
    {!teams.length ? <section className="card"><Empty text={loading ? 'Loading teams…' : 'No teams created yet. Select Create a Team to get started.'} /></section> : teams.map((team) => (
      <section key={team.id} className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div><h2 className="font-bold">{team.teamName}</h2><p className="text-xs text-slate-500">{team.members.length} members · weekly target {inr(team.weeklyTarget)} · archived {inr(team.archived)}{team.performance != null ? ` · ${team.performance.toFixed(2)}% performance` : ''}</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost !min-h-[36px] !px-3 text-xs" disabled={!validRange || exportingId === team.id} onClick={() => void exportReport(team)}><FiDownload />{exportingId === team.id ? 'Preparing…' : 'Download PNG report'}</button>
            <button type="button" className="btn btn-primary !min-h-[36px] !px-3 text-xs" onClick={() => setMemberEditor({ team })}><FiPlus />Add Team Member</button>
            <button type="button" aria-label={`Edit ${team.teamName}`} className="btn btn-ghost !min-h-[36px] !px-3 text-xs" onClick={() => setTeamEditor(team)}><FiEdit2 />Edit team</button>
            <button type="button" aria-label={`Delete ${team.teamName}`} className="btn btn-ghost !min-h-[36px] !px-3 text-xs text-red-600" onClick={() => setTeamToDelete(team)}><FiTrash2 />Delete team</button>
          </div>
        </div>
        {!team.members.length ? <Empty text="No members yet. Add a team member to start recording closures." /> : <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]"><thead><tr>{['Name', 'Designation', 'Archived in selected dates', 'Actions'].map((heading, index) => <th key={`${heading}-${index}`} className="th">{heading}</th>)}</tr></thead>
            <tbody>{team.members.map((member) => <tr key={member.id}>
              <td className="td font-semibold">{member.name}</td><td className="td">{member.designation}</td><td className="td font-semibold">{inr(member.archived)}</td>
              <td className="td"><div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost !min-h-[36px] !px-3 text-xs" onClick={() => setAddingPayment({ team, member })}><FiDollarSign />Add payment</button>
                <button type="button" aria-label={`Edit ${member.name}`} className="btn btn-ghost !min-h-[36px] !px-3 text-xs" onClick={() => setMemberEditor({ team, member })}><FiEdit2 />Edit</button>
                <button type="button" aria-label={`Delete ${member.name}`} className="btn btn-ghost !min-h-[36px] !px-3 text-xs text-red-600" onClick={() => setMemberToDelete({ team, member })}><FiTrash2 />Delete</button>
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    ))}
    <div className="pointer-events-none fixed -left-[12000px] top-0" aria-hidden="true">
      {teams.map((team) => <GreaterRewardsPng key={team.id} ref={(node) => { reportRefs.current[team.id] = node; }} team={team} from={range.from} to={range.to} />)}
    </div>
    {teamEditor !== false && <TeamForm key={teamEditor?.id || 'new'} initial={teamEditor || undefined} busy={busy} onClose={() => setTeamEditor(false)} onSave={saveTeam} />}
    {memberEditor && <MemberForm key={memberEditor.member?.id || `new-${memberEditor.team.id}`} initial={memberEditor.member} teamName={memberEditor.team.teamName} busy={busy} onClose={() => setMemberEditor(null)} onSave={saveMember} />}
    {addingPayment && <PaymentForm memberName={addingPayment.member.name} busy={busy} onClose={() => setAddingPayment(null)} onSave={savePayment} />}
    {teamToDelete && <Confirm title="Delete team?" text={`Delete ${teamToDelete.teamName}, all its members, and all their closure payment history? This cannot be undone.`} busy={busy} onNo={() => setTeamToDelete(null)} onYes={() => void removeTeam()} />}
    {memberToDelete && <Confirm title="Delete team member?" text={`Delete ${memberToDelete.member.name} from ${memberToDelete.team.teamName}, including their closure payment history? This cannot be undone.`} busy={busy} onNo={() => setMemberToDelete(null)} onYes={() => void removeMember()} />}
  </div>;
}
