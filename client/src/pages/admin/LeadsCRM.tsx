import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { FiDownload, FiEdit2, FiFilter, FiPlus, FiRefreshCw, FiTrash2, FiUsers } from 'react-icons/fi';
import { api, errMsg } from '../../api';
import { Confirm, Empty, ErrorBox, Modal, Skeleton, toast } from '../../components/ui';
import { downloadPng } from '../../utils/exportPng';
import EmployeeLeadUpdates from './EmployeeLeadUpdates';

type LeadType = 'Cold' | 'Warm' | 'Hot';
type LeadItem = { sharedTo: string; type: LeadType; remarks: string };
type DailyUpdate = { id: string; date: string; leads: LeadItem[]; recordedAt: string };
type Contact = { id: string; name: string; role: string; updates: DailyUpdate[]; createdAt: string };
type FilteredContact = { contact: Contact; updates: DailyUpdate[]; leadCount: number; performancePct: number | null };
type ContactFormValue = Pick<Contact, 'name' | 'role'>;
type DateRange = { from: string; to: string };

const LEAD_TYPES: LeadType[] = ['Cold', 'Warm', 'Hot'];
const TYPE_COLORS: Record<LeadType, string> = { Cold: '#64748b', Warm: '#f59e0b', Hot: '#16a34a' };
const TYPE_SCORE: Record<LeadType, number> = { Cold: 33, Warm: 67, Hot: 100 };
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const formatDateTime = (date: string) => new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

function ContactForm({ initial, busy, onClose, onSave }: {
  initial?: Contact;
  busy: boolean;
  onClose: () => void;
  onSave: (value: ContactFormValue) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [role, setRole] = useState(initial?.role || '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !role.trim()) {
      toast('Enter a name and role.', 'err');
      return;
    }
    void onSave({ name: name.trim(), role: role.trim() });
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <div><label className="label" htmlFor="crm-name">Name</label><input id="crm-name" autoFocus required maxLength={100} className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter name" /></div>
      <div><label className="label" htmlFor="crm-role">Role</label><input id="crm-role" required maxLength={100} className="input" value={role} onChange={(event) => setRole(event.target.value)} placeholder="Enter role" /></div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Submit'}</button></div>
    </form>
  );
}

function UpdateForm({ contact, initial, busy, onClose, onSave }: {
  contact: Contact;
  initial?: DailyUpdate;
  busy: boolean;
  onClose: () => void;
  onSave: (date: string, leads: LeadItem[]) => Promise<void>;
}) {
  const [date, setDate] = useState(initial?.date || todayKey());
  const [count, setCount] = useState(String(initial?.leads.length || 1));
  const [leads, setLeads] = useState<LeadItem[]>(initial?.leads || [{ sharedTo: '', type: 'Warm', remarks: '' }]);
  const today = todayKey();

  const changeDate = (nextDate: string) => {
    setDate(nextDate);
    const saved = contact.updates.find((item) => item.date === nextDate);
    const nextLeads = saved?.leads || [{ sharedTo: '', type: 'Warm' as const, remarks: '' }];
    setLeads(nextLeads);
    setCount(String(nextLeads.length));
  };
  const changeCount = (value: string) => {
    setCount(value);
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) return;
    setLeads((current) => Array.from({ length: parsed }, (_, index) => current[index] || { sharedTo: '', type: 'Warm', remarks: '' }));
  };
  const changeLead = (index: number, patch: Partial<LeadItem>) => {
    setLeads((current) => current.map((lead, itemIndex) => itemIndex === index ? { ...lead, ...patch } : lead));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const leadCount = Number(count);
    if (!date || date > today || !Number.isInteger(leadCount) || leadCount < 1 || leadCount > 100 || leads.length !== leadCount) {
      toast('Choose a valid date and enter a lead count from 1 to 100.', 'err');
      return;
    }
    if (leads.some((lead) => !lead.sharedTo.trim())) {
      toast('Enter who each lead was shared to.', 'err');
      return;
    }
    void onSave(date, leads.map((lead) => ({ ...lead, sharedTo: lead.sharedTo.trim(), remarks: lead.remarks.trim() })));
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-slate-500">Update lead activity for <span className="font-semibold text-ink">{contact.name}</span>. Saving again for the same date updates that day’s entry.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="crm-update-date">Update date</label><input id="crm-update-date" required type="date" max={today} className="input" value={date} disabled={!!initial} onChange={(event) => changeDate(event.target.value)} /></div>
        <div><label className="label" htmlFor="crm-lead-count">Leads count</label><input id="crm-lead-count" required type="number" min={1} max={100} step={1} className="input" value={count} onChange={(event) => changeCount(event.target.value)} /></div>
      </div>
      <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
        {leads.map((lead, index) => <fieldset key={index} className="rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-sm font-bold text-crimson-700">Lead {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor={`shared-${index}`}>Leads shared to</label><input id={`shared-${index}`} required maxLength={100} className="input" value={lead.sharedTo} onChange={(event) => changeLead(index, { sharedTo: event.target.value })} placeholder="Person or team" /></div>
            <div><label className="label" htmlFor={`type-${index}`}>Lead range</label><select id={`type-${index}`} className="input" value={lead.type} onChange={(event) => changeLead(index, { type: event.target.value as LeadType })}>{LEAD_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
          </div>
          <div className="mt-3"><label className="label" htmlFor={`remarks-${index}`}>Remarks</label><textarea id={`remarks-${index}`} rows={2} maxLength={500} className="input resize-y" value={lead.remarks} onChange={(event) => changeLead(index, { remarks: event.target.value })} placeholder="Optional notes" /></div>
        </fieldset>)}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save update'}</button></div>
    </form>
  );
}

function ContactDetails({ contact, onEdit, onClose }: { contact: Contact; onEdit: (update: DailyUpdate) => void; onClose: () => void }) {
  const updates = [...contact.updates].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Modal title={`${contact.name} · ${contact.role}`} wide onClose={onClose}>
      <div className="space-y-4">
        {!updates.length ? <Empty text="No lead updates have been submitted yet." /> : updates.map((update) => <section key={update.id || update.date} className="rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div><h4 className="font-bold">{formatDate(update.date)}</h4><p className="text-xs text-slate-500">Saved {formatDateTime(update.recordedAt)}</p></div>
            <button type="button" className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs" onClick={() => onEdit(update)}><FiEdit2 /> Edit</button>
          </div>
          <div className="divide-y divide-slate-100 px-3">
            {update.leads.map((lead, index) => <div key={`${update.date}-${index}`} className="grid gap-1 py-3 text-sm sm:grid-cols-[90px_1fr_1fr_1.5fr]">
              <span className="font-semibold">Lead {index + 1}</span><span><LeadBadge type={lead.type} /></span><span>Shared to: <b>{lead.sharedTo}</b></span><span className="break-words text-slate-600">Remarks: {lead.remarks || '—'}</span>
            </div>)}
          </div>
        </section>)}
      </div>
    </Modal>
  );
}

function LeadBadge({ type }: { type: LeadType }) {
  const classes: Record<LeadType, string> = { Cold: 'bg-slate-100 text-slate-700', Warm: 'bg-amber-100 text-amber-800', Hot: 'bg-emerald-100 text-emerald-800' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classes[type]}`}>{type}</span>;
}

function ReportModal({ rows, range, onClose }: { rows: FilteredContact[]; range: DateRange; onClose: () => void }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const totals = useMemo(() => {
    const typeCounts: Record<LeadType, number> = { Cold: 0, Warm: 0, Hot: 0 };
    const shared = new Map<string, number>();
    let total = 0;
    let performanceTotal = 0;
    rows.forEach(({ updates }) => updates.forEach((update) => update.leads.forEach((lead) => {
      typeCounts[lead.type] += 1;
      shared.set(lead.sharedTo, (shared.get(lead.sharedTo) || 0) + 1);
      performanceTotal += TYPE_SCORE[lead.type];
      total += 1;
    })));
    const mostSharedTo = [...shared.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return { typeCounts, total, mostSharedTo, performancePct: total ? Math.round(performanceTotal / total) : null };
  }, [rows]);
  const chartData = LEAD_TYPES.map((type) => ({ name: type, value: totals.typeCounts[type] }));
  const exportReport = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const suffix = range.from || range.to ? `${range.from || 'start'}_to_${range.to || 'today'}` : 'all_dates';
      await downloadPng(reportRef.current, `leads_report_${suffix}.png`);
    } catch (error) {
      toast(errMsg(error), 'err');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal title="Leads report" wide onClose={onClose}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">A PNG snapshot of the current lead filters.</p>
        <button type="button" disabled={exporting || !totals.total} className="btn btn-primary" onClick={() => void exportReport()}><FiDownload />{exporting ? 'Preparing…' : 'Download PNG'}</button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <div ref={reportRef} className="min-w-[760px] bg-white p-6 text-ink">
          <header className="flex items-start justify-between gap-4 border-b-2 border-crimson-600 pb-4">
            <div><div className="text-xs font-bold uppercase tracking-[0.2em] text-crimson-700">Growthora · Leads Management</div><h2 className="mt-1 text-2xl font-extrabold">CRM Leads Report</h2></div>
            <div className="text-right text-xs text-slate-500"><div>Period: {range.from ? formatDate(range.from) : 'All dates'}{range.to ? ` – ${formatDate(range.to)}` : ''}</div><div>Generated: {formatDateTime(new Date().toISOString())}</div></div>
          </header>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[['Total leads', String(totals.total)], ['Overall performance', totals.performancePct == null ? '—' : `${totals.performancePct}%`], ['Cold leads', String(totals.typeCounts.Cold)], ['Warm leads', String(totals.typeCounts.Warm)], ['Hot leads', String(totals.typeCounts.Hot)]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 px-2.5 py-2"><div className="min-h-6 text-[9px] font-semibold uppercase leading-3 text-slate-500">{label}</div><div className="mt-0.5 text-lg font-extrabold">{value}</div></div>)}
          </div>
          <table className="mt-5 w-full table-fixed border-collapse text-xs">
            <colgroup><col className="w-[22%]" /><col className="w-[9%]" /><col className="w-[11%]" /><col className="w-[58%]" /></colgroup>
            <thead><tr className="bg-crimson-50 text-left">
              <th className="border-b border-crimson-200 px-2 py-2 font-bold uppercase">Name</th>
              <th className="border-b border-crimson-200 px-1 py-2 text-center font-bold uppercase">Leads</th>
              <th className="border-b border-crimson-200 px-1 py-2 text-center font-bold uppercase">Overall %</th>
              <th className="border-b border-crimson-200 px-2 py-2 font-bold uppercase">Lead details</th>
            </tr></thead>
            <tbody>{rows.map(({ contact, updates, leadCount, performancePct }) => <tr key={contact.id} className="align-top even:bg-slate-50">
              <td className="break-words border-b border-slate-100 px-2 py-2 font-bold">{contact.name}</td>
              <td className="border-b border-slate-100 px-1 py-2 text-center font-bold">{leadCount}</td>
              <td className="border-b border-slate-100 px-1 py-2 text-center font-bold text-emerald-700">{performancePct == null ? '—' : `${performancePct}%`}</td>
              <td className="break-words border-b border-slate-100 px-2 py-2">
                {updates.flatMap((update) => update.leads).map((lead, index) => (
                  <div key={`${contact.id}-lead-${index}`} className="mb-1 last:mb-0">
                    <b>Lead {index + 1}</b> — <span style={{ color: TYPE_COLORS[lead.type], fontWeight: 700 }}>{lead.type}</span> — Shared to: {lead.sharedTo} — Remark: {lead.remarks || '—'}
                  </div>
                ))}
              </td>
            </tr>)}</tbody>
          </table>
          <div className="mt-5 grid grid-cols-[1fr_330px] items-center gap-4 border-t border-slate-200 pt-4">
            <div className="space-y-2 text-sm">
              <div><span className="font-bold">Most shared to:</span> {totals.mostSharedTo ? `${totals.mostSharedTo[0]} (${totals.mostSharedTo[1]} leads)` : '—'}</div>
              <div className="flex flex-wrap gap-3">{LEAD_TYPES.map((type) => <span key={type} className="font-semibold" style={{ color: TYPE_COLORS[type] }}>{type}: {totals.typeCounts[type]}</span>)}</div>
              <p className="pt-1 text-[10px] text-slate-500">Performance index: Cold 33% · Warm 67% · Hot 100%.</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <PieChart width={170} height={170}>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={62}>
                  {chartData.map((item) => <Cell key={item.name} fill={TYPE_COLORS[item.name as LeadType]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
              <ul className="min-w-[125px] space-y-3 text-xs">
                {chartData.map((item) => <li key={item.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLORS[item.name as LeadType] }} />{item.name}</span>
                  <span className="font-bold text-slate-600">{item.value} ({totals.total ? Math.round(item.value / totals.total * 100) : 0}%)</span>
                </li>)}
              </ul>
            </div>
          </div>
          <footer className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400">Internal report · {totals.total} leads across {rows.length} CRM contacts</footer>
        </div>
      </div>
    </Modal>
  );
}

function CRMLeadsContent() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formContact, setFormContact] = useState<Contact | 'new' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updateTarget, setUpdateTarget] = useState<{ contactId: string; update?: DailyUpdate } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const [typeFilter, setTypeFilter] = useState<LeadType | 'all'>('all');
  const [sharedToFilter, setSharedToFilter] = useState('all');
  const selectedContact = contacts.find((contact) => contact.id === selectedId);
  const targetContact = updateTarget && contacts.find((contact) => contact.id === updateTarget.contactId);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/leads');
      setContacts(data.items);
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const sharedToOptions = useMemo(() => [...new Set(contacts.flatMap((contact) => contact.updates.flatMap((update) => update.leads.map((lead) => lead.sharedTo))))].sort((a, b) => a.localeCompare(b)), [contacts]);
  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.map((contact): FilteredContact => {
      const updates = contact.updates.map((update) => ({
        ...update,
        leads: update.leads.filter((lead) => (typeFilter === 'all' || lead.type === typeFilter)
          && (sharedToFilter === 'all' || lead.sharedTo === sharedToFilter)),
      })).filter((update) => (!range.from || update.date >= range.from) && (!range.to || update.date <= range.to) && update.leads.length > 0);
      const leadCount = updates.reduce((sum, update) => sum + update.leads.length, 0);
      const performanceTotal = updates.reduce((sum, update) => sum + update.leads.reduce((updateSum, lead) => updateSum + TYPE_SCORE[lead.type], 0), 0);
      return { contact, updates, leadCount, performancePct: leadCount ? Math.round(performanceTotal / leadCount) : null };
    }).filter(({ contact, leadCount }) => (leadCount > 0 || (typeFilter === 'all' && sharedToFilter === 'all' && !range.from && !range.to)) && (!query || `${contact.name} ${contact.role}`.toLowerCase().includes(query)));
  }, [contacts, range, search, sharedToFilter, typeFilter]);
  const summary = useMemo(() => filteredContacts.reduce((total, row) => {
    row.updates.forEach((update) => update.leads.forEach((lead) => { total[lead.type] += 1; total.all += 1; total.performanceTotal += TYPE_SCORE[lead.type]; }));
    return total;
  }, { Cold: 0, Warm: 0, Hot: 0, all: 0, performanceTotal: 0 }), [filteredContacts]);

  const saveContact = async (value: ContactFormValue) => {
    setBusy(true);
    try {
      if (formContact === 'new') await api.post('/leads', value);
      else if (formContact) await api.put(`/leads/${formContact.id}`, value);
      toast(formContact === 'new' ? 'CRM lead added.' : 'CRM lead updated.');
      setFormContact(null);
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };
  const deleteContact = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.delete(`/leads/${deleteTarget.id}`);
      toast(`${deleteTarget.name} and its CRM records were deleted.`);
      setDeleteTarget(null);
      if (selectedId === deleteTarget.id) setSelectedId(null);
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };
  const saveUpdate = async (date: string, leads: LeadItem[]) => {
    if (!targetContact) return;
    setBusy(true);
    try {
      await api.put(`/leads/${targetContact.id}/updates/${date}`, { leads });
      toast(`Lead update saved for ${targetContact.name}.`);
      setUpdateTarget(null);
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><FiUsers className="text-crimson-600" size={22} /><h1 className="text-2xl font-extrabold">Leads Management</h1></div><p className="mt-1 text-sm text-slate-500">Manage CRM contacts and daily lead activity.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-ghost" disabled={loading} onClick={() => void reload()}><FiRefreshCw />Refresh</button><button type="button" className="btn btn-primary" onClick={() => setFormContact('new')}><FiPlus />New</button></div>
      </div>

      <section className="card p-4">
        <div className="mb-3 flex items-center gap-2 font-bold"><FiFilter className="text-crimson-600" />Filter leads</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div><label className="label" htmlFor="crm-search">Name or role</label><input id="crm-search" className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts" /></div>
          <div><label className="label" htmlFor="crm-from">From date</label><input id="crm-from" type="date" className="input" max={todayKey()} value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></div>
          <div><label className="label" htmlFor="crm-to">To date</label><input id="crm-to" type="date" className="input" min={range.from || undefined} max={todayKey()} value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></div>
          <div><label className="label" htmlFor="crm-type">Lead type</label><select id="crm-type" className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as LeadType | 'all')}><option value="all">All types</option>{LEAD_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
          <div><label className="label" htmlFor="crm-shared-to">Shared to</label><select id="crm-shared-to" className="input" value={sharedToFilter} onChange={(event) => setSharedToFilter(event.target.value)}><option value="all">Everyone</option>{sharedToOptions.map((person) => <option key={person}>{person}</option>)}</select></div>
        </div>
        {range.from && range.to && range.from > range.to && <p className="mt-2 text-xs text-red-600">The start date must be on or before the end date.</p>}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[['Matching leads', String(summary.all), 'text-crimson-700'], ['Overall performance', summary.all ? `${Math.round(summary.performanceTotal / summary.all)}%` : '—', 'text-emerald-700'], ['Cold', String(summary.Cold), 'text-slate-600'], ['Warm', String(summary.Warm), 'text-amber-700'], ['Hot', String(summary.Hot), 'text-emerald-700']].map(([label, value, color]) => <div key={label} className="card p-3"><div className="text-xs font-semibold text-slate-500">{label}</div><div className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</div></div>)}
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div><h2 className="font-bold">CRM Leads</h2><p className="text-xs text-slate-500">{filteredContacts.length} contacts matching filters</p></div>
          <button type="button" className="btn btn-ghost !min-h-[38px] !px-3" disabled={!summary.all} onClick={() => setShowReport(true)}><FiDownload />Leads report</button>
        </div>
        {error && <div className="p-4"><ErrorBox text={error} onRetry={() => void reload()} /></div>}
        {loading && !contacts.length ? <div className="space-y-3 p-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
          : filteredContacts.length ? <div className="divide-y divide-slate-100">
            {filteredContacts.map(({ contact, updates, leadCount, performancePct }) => <article key={contact.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className="min-w-0 text-left" onClick={() => setSelectedId(contact.id)}>
                <span className="block truncate text-base font-bold text-crimson-700 hover:underline">{contact.name}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{contact.role} · {leadCount} matching {leadCount === 1 ? 'lead' : 'leads'}{performancePct != null ? ` · ${performancePct}% overall` : ''}</span>
                <span className="mt-1 block text-xs text-slate-400">{updates.length ? `Latest: ${formatDate([...updates].sort((a, b) => b.date.localeCompare(a.date))[0].date)}` : 'No updates'}</span>
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary !min-h-[36px] !px-3 !py-1.5 text-xs" onClick={() => setUpdateTarget({ contactId: contact.id })}>Update Leads</button>
                <button type="button" aria-label={`Edit ${contact.name}`} title="Edit contact" className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs" onClick={() => setFormContact(contact)}><FiEdit2 />Edit</button>
                <button type="button" aria-label={`Delete ${contact.name}`} title="Delete contact" className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5 text-xs text-red-600" onClick={() => setDeleteTarget(contact)}><FiTrash2 />Delete</button>
              </div>
            </article>)}
          </div> : <div className="p-4"><Empty text={loading ? 'Loading CRM leads…' : contacts.length ? 'No leads match these filters.' : 'No CRM leads yet. Select New to add one.'} /></div>}
      </section>

      {formContact && <Modal title={formContact === 'new' ? 'New CRM lead' : 'Edit CRM lead'} onClose={() => setFormContact(null)}><ContactForm initial={formContact === 'new' ? undefined : formContact} busy={busy} onClose={() => setFormContact(null)} onSave={saveContact} /></Modal>}
      {targetContact && <Modal title={`Update leads · ${targetContact.name}`} wide onClose={() => setUpdateTarget(null)}><UpdateForm contact={targetContact} initial={updateTarget?.update} busy={busy} onClose={() => setUpdateTarget(null)} onSave={saveUpdate} /></Modal>}
      {selectedContact && <ContactDetails contact={selectedContact} onClose={() => setSelectedId(null)} onEdit={(update) => { setSelectedId(null); setUpdateTarget({ contactId: selectedContact.id, update }); }} />}
      {deleteTarget && <Confirm title="Delete CRM lead?" text={`Delete ${deleteTarget.name} and all of their daily lead records? This cannot be undone.`} busy={busy} onNo={() => setDeleteTarget(null)} onYes={() => void deleteContact()} />}
      {showReport && <ReportModal rows={filteredContacts} range={range} onClose={() => setShowReport(false)} />}
    </div>
  );
}

export default function LeadsCRM() {
  const [tab, setTab] = useState<'crm' | 'employee'>('crm');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200" role="tablist" aria-label="Leads management sections">
        <button type="button" role="tab" aria-selected={tab === 'crm'} className={`border-b-2 px-4 py-2 text-sm font-semibold ${tab === 'crm' ? 'border-crimson-600 text-crimson-700' : 'border-transparent text-slate-500'}`} onClick={() => setTab('crm')}>CRM Leads</button>
        <button type="button" role="tab" aria-selected={tab === 'employee'} className={`border-b-2 px-4 py-2 text-sm font-semibold ${tab === 'employee' ? 'border-crimson-600 text-crimson-700' : 'border-transparent text-slate-500'}`} onClick={() => setTab('employee')}>Employee Lead Updates</button>
      </div>
      {tab === 'crm' ? <CRMLeadsContent /> : <EmployeeLeadUpdates />}
    </div>
  );
}
