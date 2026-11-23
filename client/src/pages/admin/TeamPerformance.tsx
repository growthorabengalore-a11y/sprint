import { FormEvent, useMemo, useRef, useState } from 'react';
import { FiAward, FiDownload, FiEdit2, FiPlus, FiTarget, FiTrash2 } from 'react-icons/fi';
import { api, errMsg } from '../../api';
import { Confirm, Empty, ErrorBox, Modal, Skeleton, toast } from '../../components/ui';
import { useFetch } from '../../components/useFetch';
import { downloadPng } from '../../utils/exportPng';
import { fmtDate, nowStamp } from '../../utils/format';
import TeamPerformancePng from '../../reports/TeamPerformancePng';

const categories = ['funding', 'certificate', 'compliance', 'service', 'marketing'] as const;
type Category = typeof categories[number];
type Count = { category: Category; count: number };
type Member = {
  id: string;
  name: string;
  role: string;
  targets: Count[];
  archived: Count[];
  performance: { target: number; archived: number; percentage: number } | null;
};
type Team = { id: string; teamSeries: string; teamName: string; members: Member[]; archivedAt: string | null };
type PageData = { items: Team[]; weekEnding: string; today: string };
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const countText = (items: Count[]) => items.length ? items.map((item) => `${label(item.category)} ${item.count}`).join(' · ') : '—';
const defaultSaturday = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const date = new Date(`${today}T00:00:00.000Z`);
  const offset = (6 - date.getUTCDay() + 7) % 7;
  return new Date(date.getTime() + offset * 86400000).toISOString().slice(0, 10);
};
const isSaturday = (value: string) => value && new Date(`${value}T00:00:00.000Z`).getUTCDay() === 6;

function TeamForm({ initial, busy, onClose, onSave }: {
  initial?: Team;
  busy: boolean;
  onClose: () => void;
  onSave: (teamName: string) => Promise<void>;
}) {
  const [teamName, setTeamName] = useState(initial?.teamName || '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(teamName.trim());
  };
  return <form className="space-y-4" onSubmit={submit}>
    <div><label className="label" htmlFor="performance-team-name">Team name</label><input id="performance-team-name" autoFocus required maxLength={100} className="input" value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="e.g. Seniors" /></div>
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save team' : 'Create team'}</button></div>
  </form>;
}

function MemberForm({ initial, weekEnding, busy, onClose, onSave }: {
  initial?: Member;
  weekEnding: string;
  busy: boolean;
  onClose: () => void;
  onSave: (value: { name: string; role: string; weekEnding: string; targets: Count[] }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [role, setRole] = useState(initial?.role || '');
  const [targets, setTargets] = useState<Count[]>(initial?.targets || []);
  const toggle = (category: Category) => setTargets((current) => current.some((item) => item.category === category)
    ? current.filter((item) => item.category !== category)
    : [...current, { category, count: 0 }]);
  const changeCount = (category: Category, count: number) => setTargets((current) => current.map((item) => item.category === category ? { ...item, count } : item));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!targets.length) { toast('Select at least one target category.', 'err'); return; }
    void onSave({ name: name.trim(), role: role.trim(), weekEnding, targets });
  };
  return <form className="space-y-4" onSubmit={submit}>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><label className="label" htmlFor="performance-member-name">Name</label><input id="performance-member-name" autoFocus required maxLength={100} className="input" value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div><label className="label" htmlFor="performance-member-role">Role</label><input id="performance-member-role" required maxLength={100} className="input" value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Senior Associate" /></div>
    </div>
    <div>
      <label className="label">This week's target categories · week ending {fmtDate(weekEnding)}</label>
      <details className="relative rounded-lg border border-slate-200">
        <summary className="cursor-pointer px-3 py-2 text-sm">{targets.length ? `${targets.length} categories selected` : 'Select categories'}</summary>
        <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
          {categories.map((category) => <label key={category} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={targets.some((item) => item.category === category)} onChange={() => toggle(category)} />{label(category)}
          </label>)}
        </div>
      </details>
    </div>
    {!!targets.length && <div className="space-y-2">
      <p className="text-sm font-semibold">Enter a target count for each selected category</p>
      {targets.map((item) => <div key={item.category} className="grid grid-cols-2 items-center gap-3">
        <label className="text-sm" htmlFor={`target-${item.category}`}>{label(item.category)}</label>
        <input id={`target-${item.category}`} type="number" inputMode="numeric" min={0} max={1000000} step={1} required className="input" value={item.count} onChange={(event) => changeCount(item.category, Number(event.target.value))} />
      </div>)}
    </div>}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save member and target' : 'Add member'}</button></div>
  </form>;
}

function ArchiveForm({ member, weekEnding, busy, onClose, onSave }: {
  member: Member;
  weekEnding: string;
  busy: boolean;
  onClose: () => void;
  onSave: (archived: Count[]) => Promise<void>;
}) {
  const [archived, setArchived] = useState<Count[]>(member.targets.map((target) => ({
    category: target.category,
    count: member.archived.find((item) => item.category === target.category)?.count ?? 0,
  })));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(archived);
  };
  return <form className="space-y-4" onSubmit={submit}>
    <p className="text-sm text-slate-600">Enter how many items {member.name} closed for each target category. Enter 0 when none were closed.</p>
    <div className="space-y-2">{archived.map((item) => <div key={item.category} className="grid grid-cols-2 items-center gap-3">
      <label className="text-sm" htmlFor={`archived-${item.category}`}>{label(item.category)} <span className="text-slate-500">(target {member.targets.find((target) => target.category === item.category)?.count ?? 0})</span></label>
      <input id={`archived-${item.category}`} type="number" inputMode="numeric" min={0} max={1000000} step={1} required className="input" value={item.count} onChange={(event) => setArchived((current) => current.map((entry) => entry.category === item.category ? { ...entry, count: Number(event.target.value) } : entry))} />
    </div>)}</div>
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save archived counts'}</button></div>
  </form>;
}

export default function TeamPerformance() {
  const [weekEnding, setWeekEnding] = useState(defaultSaturday);
  const { data, loading, error, reload } = useFetch<PageData>('/team-performance', { weekEnding });
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [teamEditor, setTeamEditor] = useState<{ team?: Team } | null>(null);
  const [memberEditor, setMemberEditor] = useState<{ team: Team; member?: Member } | null>(null);
  const [archiveEditor, setArchiveEditor] = useState<{ team: Team; member: Member } | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);
  const [deleteMember, setDeleteMember] = useState<{ team: Team; member: Member } | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const teams = data?.items || [];
  const weekDate = weekEnding;
  const canArchive = !!data && weekDate <= data.today;
  const reportTeams = useMemo(() => teams, [teams]);

  const saveTeam = async (teamName: string) => {
    setBusy(true);
    try {
      if (teamEditor?.team) {
        await api.put(`/team-performance/${teamEditor.team.id}`, { teamName });
        toast('Team updated');
      } else {
        const { data: response } = await api.post('/team-performance', { teamName });
        toast(`Team ${response.team.teamSeries} created`);
      }
      setTeamEditor(null);
      await reload();
    } catch (requestError) { toast(errMsg(requestError), 'err'); }
    finally { setBusy(false); }
  };

  const saveMember = async (input: { name: string; role: string; weekEnding: string; targets: Count[] }) => {
    if (!memberEditor) return;
    setBusy(true);
    try {
      if (memberEditor.member) {
        await api.put(`/team-performance/${memberEditor.team.id}/members/${memberEditor.member.id}`, input);
        toast('Member and weekly target updated');
      } else {
        await api.post(`/team-performance/${memberEditor.team.id}/members`, input);
        toast('Team member added');
      }
      setMemberEditor(null);
      await reload();
    } catch (requestError) { toast(errMsg(requestError), 'err'); }
    finally { setBusy(false); }
  };

  const saveArchive = async (archived: Count[]) => {
    if (!archiveEditor) return;
    setBusy(true);
    try {
      await api.put(`/team-performance/${archiveEditor.team.id}/members/${archiveEditor.member.id}/archive/${weekDate}`, { archived });
      toast('Saturday archived counts saved');
      setArchiveEditor(null);
      await reload();
    } catch (requestError) { toast(errMsg(requestError), 'err'); }
    finally { setBusy(false); }
  };

  const removeTeam = async () => {
    if (!deleteTeam) return;
    setBusy(true);
    try {
      await api.delete(`/team-performance/${deleteTeam.id}`);
      setDeleteTeam(null);
      toast('Team and its weekly records deleted');
      await reload();
    } catch (requestError) { toast(errMsg(requestError), 'err'); }
    finally { setBusy(false); }
  };

  const removeMember = async () => {
    if (!deleteMember) return;
    setBusy(true);
    try {
      await api.delete(`/team-performance/${deleteMember.team.id}/members/${deleteMember.member.id}`);
      setDeleteMember(null);
      toast('Member and their weekly records deleted');
      await reload();
    } catch (requestError) { toast(errMsg(requestError), 'err'); }
    finally { setBusy(false); }
  };

  const exportPng = async () => {
    if (!reportRef.current || !teams.length) return;
    setExporting(true);
    try {
      await downloadPng(reportRef.current, `Team-Performance-${weekDate}.png`);
    } catch (requestError) { toast(errMsg(requestError), 'err'); }
    finally { setExporting(false); }
  };

  if (error) return <ErrorBox text={error} onRetry={() => void reload()} />;
  if (loading || data?.weekEnding !== weekEnding) return <Skeleton className="h-40 w-full" />;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">Team Performance</h1><p className="text-sm text-slate-500">Create teams, set weekly member targets, and record Saturday's closed counts.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost" disabled={exporting || !teams.length} onClick={() => void exportPng()}><FiDownload />{exporting ? 'Preparing…' : 'Download PNG report'}</button>
        <button type="button" className="btn btn-primary" onClick={() => setTeamEditor({})}><FiPlus />Create team</button>
      </div>
    </div>

    <section className="card flex flex-wrap items-end justify-between gap-3 p-4">
      <div><label className="label" htmlFor="team-week-ending">Week ending (Saturday)</label><input id="team-week-ending" type="date" className="input" value={weekDate} onChange={(event) => {
        const next = event.target.value;
        if (!isSaturday(next)) { toast('Select a Saturday for the week ending date.', 'err'); return; }
        setWeekEnding(next);
        setMemberEditor(null);
        setArchiveEditor(null);
      }} /></div>
      <div className="text-xs text-slate-500">Targets and archived totals are saved separately for each Saturday.</div>
    </section>

    {error && <ErrorBox text={error} onRetry={() => void reload()} />}
    {!teams.length ? <section className="card"><Empty text="No teams created yet. Select Create team to get started." /></section> : teams.map((team) => (
      <section key={team.id} className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div><h2 className="font-bold">{`Team ${team.teamSeries} · ${team.teamName}`}</h2><p className="text-xs text-slate-500">{team.members.length} members · week ending {fmtDate(weekDate)}{team.archivedAt ? ` · archived ${new Date(team.archivedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}` : ''}</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost !min-h-[36px] !px-3 text-xs" onClick={() => setMemberEditor({ team })}><FiPlus />Add member</button>
            <button type="button" aria-label={`Edit Team ${team.teamSeries}`} className="btn btn-ghost !min-h-[36px] !px-3" onClick={() => setTeamEditor({ team })}><FiEdit2 /></button>
            <button type="button" aria-label={`Delete Team ${team.teamSeries}`} className="btn btn-ghost !min-h-[36px] !px-3 text-red-600" onClick={() => setDeleteTeam(team)}><FiTrash2 /></button>
          </div>
        </div>
        {!team.members.length ? <Empty text="No members yet. Add a member with their role and weekly targets." /> : <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]"><thead><tr>{['Name', 'Role', 'Target', 'Archived', 'Performance', 'Actions'].map((heading) => <th key={heading} className="th">{heading}</th>)}</tr></thead>
            <tbody>{team.members.map((member) => <tr key={member.id}>
              <td className="td font-semibold">{member.name}</td><td className="td">{member.role}</td>
              <td className="td whitespace-normal">{countText(member.targets)}</td>
              <td className="td whitespace-normal">{member.archived.length ? countText(member.archived) : <span className="text-slate-400">Not entered</span>}</td>
              <td className="td font-semibold">{member.performance ? `${member.performance.percentage.toFixed(2)}%` : '—'}</td>
              <td className="td"><div className="flex gap-2">
                <button type="button" className="btn btn-ghost !min-h-[34px] !px-2 text-xs" onClick={() => setMemberEditor({ team, member })}><FiEdit2 />Edit</button>
                <button type="button" className="btn btn-ghost !min-h-[34px] !px-2 text-xs text-red-600" aria-label={`Delete ${member.name}`} onClick={() => setDeleteMember({ team, member })}><FiTrash2 /></button>
                <button type="button" className="btn btn-primary !min-h-[34px] !px-2 text-xs" disabled={!canArchive || !member.targets.length} title={!canArchive ? 'Archived counts can be entered on or after Saturday' : undefined} onClick={() => setArchiveEditor({ team, member })}><FiTarget />{member.performance ? 'Edit archived' : 'Enter archived'}</button>
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    ))}

    <div className="fixed -left-[12000px] top-0 pointer-events-none" aria-hidden="true">
      <TeamPerformancePng ref={reportRef} weekEnding={weekDate} teams={reportTeams} />
    </div>

    {teamEditor && <Modal title={teamEditor.team ? `Edit Team ${teamEditor.team.teamSeries}` : 'Create team'} onClose={() => setTeamEditor(null)}>
      <TeamForm initial={teamEditor.team} busy={busy} onClose={() => setTeamEditor(null)} onSave={saveTeam} />
    </Modal>}
    {memberEditor && <Modal title={memberEditor.member ? `Edit ${memberEditor.member.name}` : `Add member · Team ${memberEditor.team.teamSeries}`} wide onClose={() => setMemberEditor(null)}>
      <MemberForm key={`${memberEditor.team.id}-${memberEditor.member?.id || 'new'}-${weekDate}`} initial={memberEditor.member} weekEnding={weekDate} busy={busy} onClose={() => setMemberEditor(null)} onSave={saveMember} />
    </Modal>}
    {archiveEditor && <Modal title={`Saturday archive · ${archiveEditor.member.name}`} onClose={() => setArchiveEditor(null)}>
      <ArchiveForm key={`${archiveEditor.team.id}-${archiveEditor.member.id}-${weekDate}`} member={archiveEditor.member} weekEnding={weekDate} busy={busy} onClose={() => setArchiveEditor(null)} onSave={saveArchive} />
    </Modal>}
    {deleteTeam && <Confirm busy={busy} title="Delete team?" text={`Delete Team ${deleteTeam.teamSeries} and all its members and weekly targets/archive records? This cannot be undone.`} onNo={() => setDeleteTeam(null)} onYes={() => void removeTeam()} />}
    {deleteMember && <Confirm busy={busy} title="Delete member?" text={`Delete ${deleteMember.member.name} and their weekly targets/archive records? This cannot be undone.`} onNo={() => setDeleteMember(null)} onYes={() => void removeMember()} />}
  </div>;
}
