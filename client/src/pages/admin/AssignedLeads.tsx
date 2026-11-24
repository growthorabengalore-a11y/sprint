import { FormEvent, useMemo, useState } from 'react';
import { FiDownload, FiRefreshCw, FiUsers } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { api, errMsg } from '../../api';
import { Empty, ErrorBox, Modal, Skeleton, toast } from '../../components/ui';
import { useFetch } from '../../components/useFetch';
import { fmtDate } from '../../utils/format';

type LeadStatus = 'Cold' | 'Warm' | 'Hot';
type EmployeeLead = {
  assignedTo: string;
  leadStatus: LeadStatus;
  paymentStatus: string;
  leaderRemarks: string;
  leadCount: number;
};
type EmployeeLeadUpdate = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  dateKey: string;
  leadCount: number;
  leads: EmployeeLead[];
  createdAt: string;
};
type LeadRow = EmployeeLead & {
  updateId: string;
  leadIndex: number;
  employeeName: string;
  employeeCode: string;
  dateKey: string;
};
type DateRange = { from: string; to: string };

function AssigneeDetails({ assignee, leads, onClose, onSave }: {
  assignee: string;
  leads: LeadRow[];
  onClose: () => void;
  onSave: (lead: LeadRow, remarks: string) => Promise<void>;
}) {
  const [remarks, setRemarks] = useState<Record<string, string>>(() => Object.fromEntries(
    leads.map((lead) => [`${lead.updateId}:${lead.leadIndex}`, lead.leaderRemarks || '']),
  ));
  const [saving, setSaving] = useState<string | null>(null);
  const orderedLeads = [...leads].sort((a, b) => b.dateKey.localeCompare(a.dateKey) || a.employeeName.localeCompare(b.employeeName));

  const submit = async (event: FormEvent<HTMLFormElement>, lead: LeadRow, key: string) => {
    event.preventDefault();
    setSaving(key);
    try {
      await onSave(lead, remarks[key] || '');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal title={`${assignee} Leads`} wide onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">{leads.reduce((count, lead) => count + (lead.leadCount || 1), 0)} leads assigned to {assignee}.</p>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {orderedLeads.map((lead) => {
            const key = `${lead.updateId}:${lead.leadIndex}`;
            return (
              <form key={key} className="rounded-xl border border-slate-200 p-3" onSubmit={(event) => void submit(event, lead, key)}>
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div><h3 className="font-bold">{lead.employeeName} <span className="font-normal text-slate-500">({lead.employeeCode})</span></h3><p className="text-xs text-slate-500">{fmtDate(lead.dateKey)} · {lead.leadCount || 1} {lead.leadCount === 1 ? 'lead' : 'leads'}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${lead.leadStatus === 'Hot' ? 'bg-emerald-100 text-emerald-800' : lead.leadStatus === 'Warm' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{lead.leadStatus}</span>
                </div>
                <div className="grid gap-3 py-3 sm:grid-cols-2">
                  <div><div className="text-xs font-semibold text-slate-500">Payment status</div><p className="mt-1 whitespace-pre-wrap text-sm">{lead.paymentStatus || '—'}</p></div>
                  <div><label className="label" htmlFor={`leader-remarks-${key}`}>Leader remarks</label><textarea id={`leader-remarks-${key}`} rows={2} maxLength={500} className="input resize-y" value={remarks[key] || ''} onChange={(event) => setRemarks((current) => ({ ...current, [key]: event.target.value }))} placeholder="Write remarks for this lead" /></div>
                </div>
                <div className="flex justify-end"><button type="submit" className="btn btn-primary !min-h-[36px] !px-3 !py-1.5 text-xs" disabled={saving === key}>{saving === key ? 'Saving…' : 'Submit remarks'}</button></div>
              </form>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export default function AssignedLeads() {
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const validRange = !range.from || !range.to || range.from <= range.to;
  const { data, loading, error, reload } = useFetch<{ items: EmployeeLeadUpdate[] }>(validRange ? '/lead-updates/admin' : null, range);
  const leads = useMemo(() => (validRange ? data?.items || [] : []).flatMap((update) => update.leads.map((lead, leadIndex): LeadRow => ({
    ...lead,
    updateId: update.id,
    leadIndex,
    employeeName: update.employeeName,
    employeeCode: update.employeeCode,
    dateKey: update.dateKey,
    leadCount: lead.leadCount || 1,
  }))), [data, validRange]);
  const groups = useMemo(() => {
    const grouped = new Map<string, { name: string; leads: LeadRow[] }>();
    leads.forEach((lead) => {
      const name = lead.assignedTo.trim() || 'Unassigned';
      const key = name.toLocaleLowerCase();
      const group = grouped.get(key) || { name, leads: [] };
      group.leads.push(lead);
      grouped.set(key, group);
    });
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [leads]);
  const selectedGroup = groups.find((group) => group.name.toLocaleLowerCase() === selectedAssignee?.toLocaleLowerCase());

  const saveRemarks = async (lead: LeadRow, leaderRemarks: string) => {
    try {
      await api.put(`/lead-updates/admin/${lead.updateId}/remarks`, { leadIndex: lead.leadIndex, leaderRemarks: leaderRemarks.trim() });
      toast('Leader remarks saved.');
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    }
  };

  const downloadReport = () => {
    try {
      const rows = leads.map((lead) => ({
        'Assigned to': lead.assignedTo,
        'Employee name': lead.employeeName,
        'Employee ID': lead.employeeCode,
        Date: fmtDate(lead.dateKey),
        'Lead count': lead.leadCount,
        'Lead status': lead.leadStatus,
        'Payment status': lead.paymentStatus,
        'Leader remarks': lead.leaderRemarks || '',
      }));
      const sheet = XLSX.utils.json_to_sheet(rows, { header: ['Assigned to', 'Employee name', 'Employee ID', 'Date', 'Lead count', 'Lead status', 'Payment status', 'Leader remarks'] });
      sheet['!cols'] = [{ wch: 20 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 36 }, { wch: 36 }];
      sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1:H1' };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Assigned Leads');
      const suffix = range.from || range.to ? `${range.from || 'start'}-to-${range.to || 'today'}` : 'all-dates';
      XLSX.writeFile(workbook, `Assigned-Leads-${suffix}.xlsx`);
      toast(`Downloaded ${rows.length} lead records.`);
    } catch (exportError) {
      toast(errMsg(exportError), 'err');
    }
  };

  if (loading && !data) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2"><FiUsers className="text-crimson-600" size={22} /><h1 className="text-2xl font-extrabold">Leads by assignee</h1></div><p className="mt-1 text-sm text-slate-500">Review employee-submitted leads grouped by the person they were assigned to.</p></div>
        <div className="flex gap-2"><button type="button" className="btn btn-ghost" disabled={loading} onClick={() => void reload()}><FiRefreshCw />Refresh</button><button type="button" className="btn btn-primary" disabled={!leads.length || !validRange} onClick={downloadReport}><FiDownload />Download report</button></div>
      </div>
      <section className="card grid gap-3 p-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="assigned-leads-from">From date</label><input id="assigned-leads-from" type="date" className="input" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></div>
        <div><label className="label" htmlFor="assigned-leads-to">To date</label><input id="assigned-leads-to" type="date" min={range.from || undefined} className="input" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></div>
        {range.from && range.to && range.from > range.to && <p className="text-sm text-red-600 sm:col-span-2">From date must be on or before To date.</p>}
      </section>
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3"><h2 className="font-bold">Assigned leads</h2><p className="text-xs text-slate-500">{groups.length} assignees · {leads.reduce((count, lead) => count + lead.leadCount, 0)} leads</p></div>
        {error ? <div className="p-4"><ErrorBox text={error} onRetry={reload} /></div> : loading && !data ? <div className="p-4"><Skeleton className="h-20 w-full" /></div> : !groups.length ? <Empty text="No employee leads found for this date range." /> : <div className="divide-y divide-slate-100">
          {groups.map((group) => {
            const count = group.leads.reduce((total, lead) => total + lead.leadCount, 0);
            return <button key={group.name.toLocaleLowerCase()} type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50" onClick={() => setSelectedAssignee(group.name)}>
              <span><span className="block font-bold text-crimson-700">{group.name} Leads</span><span className="mt-0.5 block text-sm text-slate-500">{group.leads.length} employee {group.leads.length === 1 ? 'submission' : 'submissions'}</span></span>
              <span className="rounded-full bg-crimson-50 px-3 py-1 text-sm font-bold text-crimson-700">{count} {count === 1 ? 'lead' : 'leads'}</span>
            </button>;
          })}
        </div>}
      </section>
      {selectedGroup && <AssigneeDetails assignee={selectedGroup.name} leads={selectedGroup.leads} onClose={() => setSelectedAssignee(null)} onSave={saveRemarks} />}
    </div>
  );
}
