import { useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiShare2, FiEye, FiColumns, FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { api, errMsg } from '../../api';
import { useFetch } from '../../components/useFetch';
import { Confirm, Empty, ErrorBox, Modal, Skeleton, toast } from '../../components/ui';
import ClientDetails from '../../components/admin/ClientDetails';
import ClientForm from '../../components/admin/ClientForm';
import ClientLogo from '../../components/admin/ClientLogo';
import { ClientRecord, clientFile } from '../../components/admin/clientTypes';

const LIMIT = 10;
const columnOptions = [
  ['name', 'Client name'], ['companyName', 'Company'], ['phone', 'Phone'], ['email', 'Email'],
  ['submittedAt', 'Submitted at'], ['status', 'Status'],
] as const;

export default function ClientsForm() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ name: '', companyName: '', phone: '', email: '', status: 'All' });
  const [columns, setColumns] = useState<string[]>(columnOptions.map(([key]) => key));
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [editor, setEditor] = useState<'create' | 'edit' | null>(null);
  const [deletePrompt, setDeletePrompt] = useState(false);
  const [share, setShare] = useState('');
  const [busy, setBusy] = useState(false);
  const params = useMemo(() => ({ ...filters, page, limit: LIMIT }), [filters, page]);
  const { data, loading, error, reload } = useFetch('/clients', params);
  const summary = useFetch('/clients/summary');
  const clients: ClientRecord[] = data?.items || [];
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / LIMIT));

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const toggleColumn = (key: string) => setColumns((current) =>
    current.includes(key) ? current.filter((column) => column !== key) : [...current, key]);
  const onSaved = (client?: ClientRecord) => {
    setEditor(null);
    if (client) setSelected(client);
    reload();
    summary.reload();
    toast('Client saved successfully');
  };
  const removeClient = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.delete(`/clients/${selected.id}`);
      toast('Client deleted');
      setSelected(null);
      setDeletePrompt(false);
      reload();
      summary.reload();
    } catch (e) { toast(errMsg(e), 'err'); }
    finally { setBusy(false); }
  };
  const openShare = async () => {
    setBusy(true);
    try {
      const { data: response } = await api.get('/clients/intake-link');
      setShare(`${window.location.origin}/client-intake/${response.token}`);
    } catch (e) { toast(errMsg(e), 'err'); }
    finally { setBusy(false); }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(share); toast('Form link copied'); }
    catch { toast('Could not copy automatically. Select and copy the link.', 'err'); }
  };
  const downloadExcel = async () => {
    setBusy(true);
    try {
      const { data: response } = await api.get('/clients/export', { params: filters });
      const rows = (response.items as ClientRecord[]).map((client) => ({
        'Client name': client.name,
        'Company name': client.companyName,
        'Phone number': client.phone,
        Email: client.email,
        Browser: client.browser || 'Not provided',
        'Filed date': clientFile(client.filedDate),
        Status: client.status,
        'Logo / document': client.attachment?.url || '',
        'Submitted at': new Date(client.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      }));
      const sheet = XLSX.utils.json_to_sheet(rows, {
        header: ['Client name', 'Company name', 'Phone number', 'Email', 'Browser', 'Filed date', 'Status', 'Logo / document', 'Submitted at'],
      });
      sheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 38 }, { wch: 24 }];
      sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1:I1' };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Clients');
      XLSX.writeFile(workbook, `Clients-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast(`Downloaded ${rows.length} matching client${rows.length === 1 ? '' : 's'}`);
    } catch (e) { toast(errMsg(e), 'err'); }
    finally { setBusy(false); }
  };
  const statusChanged = (client: ClientRecord) => { setSelected(client); reload(); };
  const renderCell = (client: ClientRecord, key: string) => {
    if (key === 'name') return client.name;
    if (key === 'companyName') return client.companyName;
    if (key === 'phone') return client.phone;
    if (key === 'email') return client.email;
    if (key === 'submittedAt') return new Date(client.createdAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return client.status;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">Clients</h1><p className="text-sm text-slate-500">Create, search, and manage client records.</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" disabled={busy} onClick={downloadExcel}><FiDownload /> {busy ? 'Preparing…' : 'Download Excel'}</button>
          <button className="btn btn-ghost" disabled={busy} onClick={openShare}><FiShare2 /> Share client form</button>
          <button className="btn btn-primary" onClick={() => setEditor('create')}><FiPlus /> Create client</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-crimson-100 bg-gradient-to-r from-white via-crimson-50/60 to-white p-4 shadow-sm sm:p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-crimson-100 bg-white p-2 shadow-sm sm:h-20 sm:w-20">
          <img src="/assets/images/logo.jpeg" alt="Growthora logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-crimson-600">Growthora</div>
         
          <p className="mt-0.5 text-sm text-slate-500">Client management overview</p>
        </div>
      </div>
      {summary.error && <ErrorBox text={summary.error} onRetry={summary.reload} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['Total clients', summary.data?.summary.totalClients],
          ['Unique clients', summary.data?.summary.uniqueClients],
          ["Today's submissions", summary.data?.summary.todaySubmitted],
        ].map(([label, value]) => (
          <div key={label as string} className="card p-4">
            <div className="text-xs font-semibold text-slate-500">{label}</div>
            {summary.loading && !summary.data ? <Skeleton className="mt-2 h-7 w-16" /> : <div className="mt-1 text-2xl font-extrabold">{value ?? '—'}</div>}
          </div>
        ))}
      </div>
      <div className="card space-y-3 p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {([
            ['name', 'Client name'], ['companyName', 'Company name'], ['phone', 'Phone number'], ['email', 'Email'],
          ] as const).map(([key, label]) => <input key={key} className="input" placeholder={`Filter by ${label.toLowerCase()}`} value={filters[key]} onChange={(event) => updateFilter(key, event.target.value)} />)}
          <select aria-label="Filter clients by status" className="input sm:col-span-2 lg:col-span-1" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            {['All', 'Draft', 'Active', 'Blocked', 'Completed', 'On Hold'].map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        <details className="relative">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700"><FiColumns /> Column visibility</summary>
          <div className="absolute z-20 mt-2 grid gap-2 rounded-lg border bg-white p-3 shadow-lg sm:grid-cols-2">
            {columnOptions.map(([key, label]) => <label key={key} className="flex items-center gap-2 whitespace-nowrap text-sm"><input type="checkbox" checked={columns.includes(key)} onChange={() => toggleColumn(key)} />{label}</label>)}
          </div>
        </details>
      </div>

      {error && <ErrorBox text={error} onRetry={reload} />}
      {loading && !data ? <div className="card p-4"><Skeleton className="h-32 w-full" /></div> : !clients.length ? <div className="card"><Empty text="No clients match these filters" /></div> : (
        <>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full"><thead><tr>{columnOptions.filter(([key]) => columns.includes(key)).map(([, label]) => <th key={label} className="th">{label}</th>)}<th className="th">Actions</th></tr></thead>
              <tbody>{clients.map((client) => <tr key={client.id} className="cursor-pointer hover:bg-crimson-50" onClick={() => setSelected(client)}>
                {columnOptions.filter(([key]) => columns.includes(key)).map(([key]) => <td key={key} className="td break-words">{key === 'name' ? <span className="font-semibold">{renderCell(client, key)}</span> : renderCell(client, key)}</td>)}
                <td className="td"><button className="btn btn-ghost !px-3" onClick={(event) => { event.stopPropagation(); setSelected(client); }}><FiEye /> Details</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">{clients.map((client) => <button key={client.id} className="card block w-full p-4 text-left" onClick={() => setSelected(client)}>
            <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-3"><ClientLogo client={client} /><div className="min-w-0"><div className="break-words font-bold">{client.name}</div><div className="text-sm text-slate-600">{client.companyName}</div></div></div><span className="shrink-0 rounded-full bg-crimson-50 px-2 py-1 text-xs font-semibold text-crimson-700">{client.status}</span></div>
            <div className="mt-2 break-all text-sm">{client.email}</div><div className="text-sm">{client.phone}</div><div className="mt-2 text-xs text-slate-500">Filed {clientFile(client.filedDate)}</div>
          </button>)}</div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-slate-600">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data?.total || 0)} of {data?.total || 0}</span>
            <div className="flex items-center gap-2"><button className="btn btn-ghost !px-3" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}><FiChevronLeft /></button>
              <span className="text-sm">Page {page} of {totalPages}</span><button className="btn btn-ghost !px-3" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((n) => n + 1)}><FiChevronRight /></button></div>
          </div>
        </>
      )}

      {editor && <Modal title={editor === 'create' ? 'Create client' : 'Edit client'} wide onClose={() => setEditor(null)}>
        <ClientForm initial={editor === 'edit' ? selected : null} onSaved={onSaved} onCancel={() => setEditor(null)} />
      </Modal>}
      {selected && !editor && <ClientDetails client={selected} onClose={() => setSelected(null)} onEdit={() => setEditor('edit')} onDelete={() => setDeletePrompt(true)} onStatus={statusChanged} />}
      {deletePrompt && selected && <Confirm title="Delete client?" text={`Delete ${selected.name} and its uploaded file? This cannot be undone.`} busy={busy} onNo={() => setDeletePrompt(false)} onYes={removeClient} />}
      {share && <Modal title="Share client creation form" onClose={() => setShare('')}>
        <p className="text-sm text-slate-600">Anyone with this reusable link can submit a client form. The link remains the same for future submissions.</p>
        <input className="input mt-3" readOnly value={share} onFocus={(event) => event.target.select()} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={copyLink}>Copy link</button>
          <a className="btn btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(`Please complete this client form: ${share}`)}`} target="_blank" rel="noreferrer">Send WhatsApp</a>
          <a className="btn btn-ghost" href={`mailto:?subject=${encodeURIComponent('Client creation form')}&body=${encodeURIComponent(`Please complete this client form: ${share}`)}`}>Send email</a>
        </div>
      </Modal>}
    </div>
  );
}