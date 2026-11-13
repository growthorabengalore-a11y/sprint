import { FormEvent, useMemo, useRef, useState } from 'react';
import { FiDownload, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../auth';
import { api, errMsg } from '../../api';
import { Empty, ErrorBox, Modal, Skeleton, toast } from '../../components/ui';
import { useFetch } from '../../components/useFetch';
import EmployeeLeadUpdatesPng from '../../reports/EmployeeLeadUpdatesPng';
import { downloadPng } from '../../utils/exportPng';
import { fmtDate } from '../../utils/format';

type LeadUpdate = {
  id: string;
  employeeName: string;
  employeeCode: string;
  dateKey: string;
  leadCount: number;
  assignedTo: string;
  leadStatus: 'Cold' | 'Warm' | 'Hot';
  paymentStatus: string;
  createdAt: string;
};

function submittedAt(value: string) {
  return new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

function LeadForm({ employeeName, busy, onClose, onSubmit }: { employeeName: string; busy: boolean; onClose: () => void; onSubmit: (data: Omit<LeadUpdate, 'id' | 'employeeName' | 'employeeCode' | 'dateKey' | 'createdAt'>) => Promise<void> }) {
  const [leadCount, setLeadCount] = useState('1');
  const [assignedTo, setAssignedTo] = useState('');
  const [leadStatus, setLeadStatus] = useState<LeadUpdate['leadStatus']>('Warm');
  const [paymentStatus, setPaymentStatus] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit({ leadCount: Number(leadCount), assignedTo: assignedTo.trim(), leadStatus, paymentStatus: paymentStatus.trim() });
  };
  return (
    <form className="space-y-3" onSubmit={submit}>
      <div><label className="label" htmlFor="lead-owner">Employee</label><input id="lead-owner" className="input bg-slate-50" value={employeeName} readOnly /></div>
      <div><label className="label" htmlFor="lead-count">Lead count</label><input id="lead-count" className="input" type="number" min={1} max={100000} required value={leadCount} onChange={(event) => setLeadCount(event.target.value)} /></div>
      <div><label className="label" htmlFor="lead-assigned-to">Whom did you assign this to?</label><input id="lead-assigned-to" className="input" maxLength={100} required value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Person or team name" /></div>
      <div><label className="label" htmlFor="lead-status">Lead status</label><select id="lead-status" className="input" value={leadStatus} onChange={(event) => setLeadStatus(event.target.value as LeadUpdate['leadStatus'])}><option>Cold</option><option>Warm</option><option>Hot</option></select></div>
      <div><label className="label" htmlFor="lead-payment-status">Payment status / next step</label><textarea id="lead-payment-status" className="input resize-y" rows={3} maxLength={500} required value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} placeholder="e.g. Will pay tomorrow, quote sent" /></div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit lead update'}</button></div>
    </form>
  );
}

export default function LeadUpdates() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch<{ items: LeadUpdate[] }>('/lead-updates/my');
  const [entering, setEntering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const items = data?.items || [];
  const sortedItems = useMemo(() => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [items]);

  const save = async (input: Pick<LeadUpdate, 'leadCount' | 'assignedTo' | 'leadStatus' | 'paymentStatus'>) => {
    setBusy(true);
    try {
      await api.post('/lead-updates', input);
      setEntering(false);
      toast('Lead update submitted.');
      await reload();
    } catch (requestError) {
      toast(errMsg(requestError), 'err');
    } finally {
      setBusy(false);
    }
  };
  const exportPng = async () => {
    if (!reportRef.current || !sortedItems.length) return;
    setExporting(true);
    try {
      await downloadPng(reportRef.current, `Lead-Updates-${user.employeeId}.png`);
    } catch (exportError) {
      toast(errMsg(exportError), 'err');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) return <Skeleton className="h-40 w-full" />;
  if (error) return <ErrorBox text={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Lead Updates</h1><p className="text-sm text-slate-500">Submit and review your daily lead activity.</p></div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => void reload()}><FiRefreshCw />Refresh</button>
          <button type="button" className="btn btn-primary" onClick={() => setEntering(true)}><FiPlus />Enter Lead</button>
        </div>
      </div>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div><h2 className="font-bold">My submitted leads</h2><p className="text-xs text-slate-500">{sortedItems.length} updates</p></div>
          <button type="button" className="btn btn-ghost !min-h-[36px] !px-3 text-xs" disabled={!sortedItems.length || exporting} onClick={() => void exportPng()}><FiDownload />{exporting ? 'Preparing…' : 'Download PNG report'}</button>
        </div>
        {!sortedItems.length ? <Empty text="No lead updates submitted yet." /> : <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]"><thead><tr>{['Date', 'Submitted at', 'Lead count', 'Assigned to', 'Lead status', 'Payment status / next step'].map((heading) => <th key={heading} className="th">{heading}</th>)}</tr></thead>
            <tbody>{sortedItems.map((item) => <tr key={item.id}>
              <td className="td">{fmtDate(item.dateKey)}</td><td className="td">{submittedAt(item.createdAt)}</td><td className="td font-semibold">{item.leadCount}</td>
              <td className="td">{item.assignedTo}</td><td className="td">{item.leadStatus}</td><td className="td whitespace-normal">{item.paymentStatus}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
      <div className="fixed -left-[12000px] top-0 pointer-events-none" aria-hidden="true"><EmployeeLeadUpdatesPng ref={reportRef} name={user.name} items={sortedItems} /></div>
      {entering && <Modal title="Enter lead update" onClose={() => setEntering(false)}><LeadForm employeeName={user.name} busy={busy} onClose={() => setEntering(false)} onSubmit={save} /></Modal>}
    </div>
  );
}
