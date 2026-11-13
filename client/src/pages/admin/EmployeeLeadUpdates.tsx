import { FormEvent, useMemo, useRef, useState } from 'react';
import { FiDownload, FiEdit2, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { api, errMsg } from '../../api';
import { ErrorBox, Empty, Modal, Skeleton, toast } from '../../components/ui';
import { useFetch } from '../../components/useFetch';
import { fmtDate } from '../../utils/format';
import { downloadPng } from '../../utils/exportPng';
import EmployeeLeadUpdatesPng from '../../reports/EmployeeLeadUpdatesPng';

type LeadStatus = 'Cold' | 'Warm' | 'Hot';
type LeadUpdate = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  dateKey: string;
  leadCount: number;
  assignedTo: string;
  leadStatus: LeadStatus;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
};
type LeadInput = Pick<LeadUpdate, 'leadCount' | 'assignedTo' | 'leadStatus' | 'paymentStatus'>;
const submittedAt = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

function EditLeadUpdate({ item, busy, onClose, onSave }: {
  item: LeadUpdate;
  busy: boolean;
  onClose: () => void;
  onSave: (input: LeadInput) => Promise<void>;
}) {
  const [leadCount, setLeadCount] = useState(String(item.leadCount));
  const [assignedTo, setAssignedTo] = useState(item.assignedTo);
  const [leadStatus, setLeadStatus] = useState<LeadStatus>(item.leadStatus);
  const [paymentStatus, setPaymentStatus] = useState(item.paymentStatus);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave({ leadCount: Number(leadCount), assignedTo: assignedTo.trim(), leadStatus, paymentStatus: paymentStatus.trim() });
  };
  return (
    <Modal title={`Edit lead update · ${item.employeeName}`} wide onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <p className="text-sm text-slate-500">{item.employeeCode} · {fmtDate(item.dateKey)} · Submitted {submittedAt(item.createdAt)}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="admin-lead-count">Lead count</label><input id="admin-lead-count" className="input" type="number" min={1} max={100000} required value={leadCount} onChange={(event) => setLeadCount(event.target.value)} /></div>
          <div><label className="label" htmlFor="admin-assigned-to">Assigned to</label><input id="admin-assigned-to" className="input" maxLength={100} required value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} /></div>
          <div><label className="label" htmlFor="admin-lead-status">Lead status</label><select id="admin-lead-status" className="input" value={leadStatus} onChange={(event) => setLeadStatus(event.target.value as LeadStatus)}><option>Cold</option><option>Warm</option><option>Hot</option></select></div>
          <div><label className="label" htmlFor="admin-payment-status">Payment status / next step</label><textarea id="admin-payment-status" className="input resize-y" rows={2} maxLength={500} required value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </Modal>
  );
}

export default function EmployeeLeadUpdates() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LeadUpdate | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { data, loading, error, reload } = useFetch<{ items: LeadUpdate[] }>('/lead-updates/admin', { from, to });
  const items = data?.items || [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => !query || [item.employeeName, item.employeeCode, item.assignedTo, item.leadStatus, item.paymentStatus].join(' ').toLowerCase().includes(query));
  }, [items, search]);
  const validRange = !!from && !!to && from <= to;
  const exportReport = async () => {
    if (!reportRef.current || !validRange || !filtered.length) return;
    setExporting(true);
    try {
      await downloadPng(reportRef.current, `Employee-Lead-Updates-${from}-to-${to}.png`);
    } catch (exportError) {
      toast(errMsg(exportError), 'err');
    } finally {
      setExporting(false);
    }
  };

  const save = async (input: LeadInput) => {
    if (!editing) return;
    setBusy(true);
    try {
      await api.put(`/lead-updates/admin/${editing.id}`, input);
      setEditing(null);
      toast('Employee lead update saved.');
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Skeleton className="h-40 w-full" />;
  if (error) return <ErrorBox text={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold">Employee lead updates</h2><p className="text-sm text-slate-500">Review and edit lead updates submitted by employees.</p></div>
        <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => void reload()}><FiRefreshCw />Refresh</button>
      </div>
      <section className="card grid gap-3 p-4 sm:grid-cols-3">
        <div><label className="label" htmlFor="employee-lead-search"><FiSearch className="inline" /> Search updates</label><input id="employee-lead-search" className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Employee, assignee, status…" /></div>
        <div><label className="label" htmlFor="employee-lead-from">From date</label><input id="employee-lead-from" type="date" className="input" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
        <div><label className="label" htmlFor="employee-lead-to">To date</label><input id="employee-lead-to" type="date" min={from || undefined} className="input" value={to} onChange={(event) => setTo(event.target.value)} /></div>
        {from && to && from > to && <p className="text-sm text-red-600 sm:col-span-3">From date must be on or before To date.</p>}
        <div className="sm:col-span-3">
          <button type="button" className="btn btn-primary" disabled={!validRange || !filtered.length || exporting} onClick={() => void exportReport()}>
            <FiDownload />{exporting ? 'Preparing PNG…' : 'Download Custom PNG Report'}
          </button>
          {!validRange && <p className="mt-1 text-xs text-slate-500">Choose both a From date and a To date to download a custom report.</p>}
        </div>
      </section>
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3"><h3 className="font-bold">{filtered.length} submitted updates</h3></div>
        {!filtered.length ? <Empty text="No employee lead updates found." /> : <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]"><thead><tr>{['Employee', 'Date / submitted at', 'Lead count', 'Assigned to', 'Lead status', 'Payment status / next step', ''].map((heading, index) => <th key={`${heading}-${index}`} className="th">{heading}</th>)}</tr></thead>
            <tbody>{filtered.map((item) => <tr key={item.id}>
              <td className="td"><span className="font-semibold">{item.employeeName}</span><span className="block text-xs text-slate-500">{item.employeeCode}</span></td>
              <td className="td">{fmtDate(item.dateKey)}<span className="block text-xs text-slate-500">{submittedAt(item.createdAt)}</span></td>
              <td className="td font-semibold">{item.leadCount}</td><td className="td">{item.assignedTo}</td><td className="td">{item.leadStatus}</td>
              <td className="td max-w-sm whitespace-normal">{item.paymentStatus}</td>
              <td className="td"><button type="button" className="btn btn-ghost !min-h-[34px] !px-2 text-xs" onClick={() => setEditing(item)}><FiEdit2 />Edit</button></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
      <div className="pointer-events-none fixed -left-[12000px] top-0" aria-hidden="true">
        <EmployeeLeadUpdatesPng ref={reportRef} from={from || ''} to={to || ''} items={filtered} />
      </div>
      {editing && <EditLeadUpdate item={editing} busy={busy} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}
