import { FiEdit2, FiX } from 'react-icons/fi';
import { api } from '../../api';
import ClientAttachment from './ClientAttachment';
import { toast } from '../ui';
import { ClientRecord, ClientStatus, clientFile } from './clientTypes';

type Props = {
  client: ClientRecord;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (client: ClientRecord) => void;
  onClose?: () => void;
};

export default function ClientDetails({ client, onEdit, onDelete, onStatus, onClose }: Props) {
  const changeStatus = async (status: ClientStatus) => {
    try {
      const { data } = await api.patch(`/clients/${client.id}/status`, { status });
      onStatus(data.client);
      toast(`Client marked ${status.toLowerCase()}`);
    } catch {
      toast('Unable to update client status', 'err');
    }
  };
  const actions: { label: string; status: ClientStatus; style: string }[] = [
    { label: 'Save as Draft', status: 'Draft', style: 'btn-ghost' },
    { label: 'Mark Active', status: 'Active', style: 'btn-ghost' },
    { label: 'Block', status: 'Blocked', style: 'btn-ghost text-red-700' },
    { label: 'Mark Completed', status: 'Completed', style: 'btn-primary' },
    { label: 'Put On Hold', status: 'On Hold', style: 'btn-ghost' },
  ];
  const content = (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</span><h2 className="text-2xl font-bold">{client.name}</h2><p className="text-slate-600">{client.companyName}</p></div>
        <span className="rounded-full bg-crimson-50 px-3 py-1 text-sm font-semibold text-crimson-700">{client.status}</span>
      </section>
      <dl className="grid gap-x-4 gap-y-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <Detail label="Phone" value={client.phone} /><Detail label="Email" value={client.email} />
        <Detail label="Browser" value={client.browser || 'Not provided'} />
        <Detail label="Filed date" value={clientFile(client.filedDate)} /><Detail label="Created" value={new Date(client.createdAt).toLocaleDateString('en-GB')} />
      </dl>
      <section><h3 className="mb-2 font-bold">Company logo / document</h3><ClientAttachment client={client} /></section>
      <section><h3 className="mb-2 font-bold">Client actions</h3><div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={onEdit}><FiEdit2 /> Edit</button>
        {actions.map((action) => <button key={action.status} className={`btn ${action.style}`} onClick={() => changeStatus(action.status)}>{action.label}</button>)}
        <button className="btn btn-danger" onClick={onDelete}>Delete</button>
      </div></section>
    </div>
  );

  if (!onClose) return content;
  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={`${client.name} client details`} className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto bg-white p-4 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between border-b pb-3"><h2 className="text-lg font-bold">Client details</h2><button className="btn btn-ghost !px-3" aria-label="Close details" onClick={onClose}><FiX /></button></div>
        {content}
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-0.5 break-words font-medium">{value}</dd></div>;
}
