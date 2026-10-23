import { FormEvent, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { api, errMsg } from '../../api';
import { Confirm, ErrorBox, Modal, toast } from '../../components/ui';
import ClientDetails from '../../components/admin/ClientDetails';
import ClientForm from '../../components/admin/ClientForm';
import { ClientRecord } from '../../components/admin/clientTypes';

export default function Clientdata() {
  const [query, setQuery] = useState('');
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const search = async (event?: FormEvent) => {
    event?.preventDefault();
    setError('');
    setClient(null);
    if (!query.trim()) { setError('Enter a client name, email, company name, or phone number.'); return; }
    setBusy(true);
    try {
      const { data } = await api.get('/clients/search', { params: { q: query.trim() } });
      setClient(data.client);
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };
  const save = (updated?: ClientRecord) => {
    if (updated) setClient(updated);
    setEditing(false);
    toast('Client updated');
  };
  const remove = async () => {
    if (!client) return;
    setBusy(true);
    try {
      await api.delete(`/clients/${client.id}`);
      setClient(null);
      setConfirmDelete(false);
      toast('Client deleted');
    } catch (e) { toast(errMsg(e), 'err'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Client Data</h1><p className="text-sm text-slate-500">Find a client by name, email, company, or phone number.</p></div>
      <form className="card flex flex-col gap-2 p-3 sm:flex-row" onSubmit={search}>
        <div className="relative min-w-0 flex-1">
          <FiSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input input-with-icon" placeholder="Enter name, email, company name, or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <button className="btn btn-primary sm:min-w-32" disabled={busy}><FiSearch /> {busy ? 'Searching…' : 'Search'}</button>
      </form>
      {error && <ErrorBox text={error} />}
      {client && <div className="card p-4 sm:p-6"><ClientDetails client={client} onEdit={() => setEditing(true)} onDelete={() => setConfirmDelete(true)} onStatus={setClient} /></div>}
      {editing && client && <Modal title="Edit client" wide onClose={() => setEditing(false)}><ClientForm initial={client} onSaved={save} onCancel={() => setEditing(false)} /></Modal>}
      {confirmDelete && client && <Confirm title="Delete client?" text={`Delete ${client.name} and its uploaded file? This cannot be undone.`} busy={busy} onNo={() => setConfirmDelete(false)} onYes={remove} />}
    </div>
  );
}