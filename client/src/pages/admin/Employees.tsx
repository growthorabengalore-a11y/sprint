import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiPlus, FiEye, FiEdit2, FiTrash2, FiSlash, FiCheckCircle, FiKey, FiSearch, FiCamera } from 'react-icons/fi';
import { api, errMsg } from '../../api';
import { useFetch } from '../../components/useFetch';
import { Modal, Confirm, toast, Empty, ErrorBox, Skeleton } from '../../components/ui';
import { fmtDate } from '../../utils/format';

const schema = z.object({ name: z.string().trim().min(2, 'Enter name'), email: z.string().trim().email('Invalid email'), phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter valid 10-digit mobile number') });

function EmployeeForm({ initial, onDone, onClose }: any) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: initial || {} });
  const on = async (v: any) => {
    try {
      if (initial) { await api.put(`/employees/${initial.id}`, v); toast('Employee updated'); onDone(); }
      else { const { data } = await api.post('/employees', v); onDone(data); }
    } catch (e) { toast(errMsg(e), 'err'); }
  };
  return (
    <Modal title={initial ? 'Edit employee' : 'Add employee'} onClose={onClose}>
      <form onSubmit={handleSubmit(on)} className="space-y-3">
        {(['name', 'email', 'phone'] as const).map((f) => <div key={f}><label className="label">{f === 'name' ? 'Name' : f === 'email' ? 'Email' : 'Phone number'}</label><input className="input" inputMode={f === 'phone' ? 'tel' : undefined} {...register(f)} /><p className="mt-1 text-xs text-red-600">{(errors as any)[f]?.message}</p></div>)}
        {!initial && <p className="text-xs text-slate-500">Employee ID is generated automatically (Growthora261, 262, …).</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</button></div>
      </form>
    </Modal>
  );
}
export default function Employees() {
  const [q, setQ] = useState(''); const [showArchived, setArch] = useState(false);
  const { data, loading, error, reload } = useFetch('/employees', { q, archived: showArchived });
  const [modal, setModal] = useState<any>(null); const [busy, setBusy] = useState(false);
  const items: any[] = data?.items || [];
  const run = async (fn: () => Promise<any>, ok: string) => { setBusy(true); try { const r = await fn(); toast(ok); setModal(null); reload(); return r; } catch (e) { toast(errMsg(e), 'err'); } finally { setBusy(false); } };
  const actions = (e: any) => (
    <div className="flex flex-wrap gap-1">
      <button title="View" className="btn btn-ghost !px-3" onClick={() => setModal({ t: 'view', e })}><FiEye /></button>
      {!e.archived && <>
        <button title="Edit" className="btn btn-ghost !px-3" onClick={() => setModal({ t: 'edit', e })}><FiEdit2 /></button>
        <button title={e.isActive ? 'Disable' : 'Enable'} className="btn btn-ghost !px-3" onClick={() => setModal({ t: 'toggle', e })}>{e.isActive ? <FiSlash /> : <FiCheckCircle />}</button>
        <button title="Delete" className="btn btn-ghost !px-3 text-red-600" onClick={() => setModal({ t: 'delete', e })}><FiTrash2 /></button></>}
    </div>);
  const badge = (e: any) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.archived ? 'bg-slate-200 text-slate-700' : e.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{e.archived ? 'Archived' : e.isActive ? 'Active' : 'Disabled'}</span>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">Bangalore Champs</h1><button className="btn btn-primary" onClick={() => setModal({ t: 'add' })}><FiPlus /> Add employee</button></div>
      <div className="flex flex-wrap gap-2"><div className="relative min-w-[200px] flex-1"><FiSearch className="absolute left-3 top-3.5 text-slate-400" /><input className="input pl-9" placeholder="Search name, ID, email, phone" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={(e) => setArch(e.target.checked)} /> Show archived</label></div>
      {error && <ErrorBox text={error} onRetry={reload} />}
      {loading && !data ? <div className="card p-4"><Skeleton className="h-24 w-full" /></div> : !items.length ? <div className="card"><Empty text="No employees yet" /></div> : <>
        <div className="card hidden overflow-x-auto md:block"><table className="w-full"><thead><tr>{['ID', 'Name', 'Email', 'Phone', 'Status', 'Face', 'Created', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{items.map((e) => <tr key={e.id}><td className="td font-semibold">{e.employeeId}</td><td className="td">{e.name}</td><td className="td">{e.email}</td><td className="td">{e.phone}</td><td className="td">{badge(e)}</td>
            <td className="td">{e.faceRegistered ? <span className="text-emerald-700">Registered</span> : <span className="text-slate-500">Not registered</span>}</td><td className="td">{fmtDate(e.createdAt.slice(0, 10))}</td><td className="td">{actions(e)}</td></tr>)}</tbody></table></div>
        <div className="space-y-3 md:hidden">{items.map((e) => <div key={e.id} className="card p-4"><div className="flex items-center justify-between"><div className="font-bold">{e.name}</div>{badge(e)}</div>
          <div className="text-sm text-slate-600">{e.employeeId}</div><div className="break-all text-sm">{e.email}</div><div className="text-sm">{e.phone}</div><div className="mt-2">{actions(e)}</div></div>)}</div></>}
      {modal?.t === 'add' && <EmployeeForm onClose={() => setModal(null)} onDone={(d: any) => { reload(); setModal({ t: 'created', d }); }} />}
      {modal?.t === 'edit' && <EmployeeForm initial={modal.e} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal?.t === 'created' && <Modal title="Employee created" onClose={() => setModal(null)}><p className="text-sm">Employee ID: <b>{modal.d.employee.employeeId}</b></p><p className="mt-2 text-sm">Temporary password (shown only once — share it securely):</p><div className="mt-1 select-all rounded-lg bg-slate-100 p-3 font-mono text-lg">{modal.d.temporaryPassword}</div><p className="mt-2 text-xs text-slate-500">The employee must set a new password at first login.</p><div className="mt-4 text-right"><button className="btn btn-primary" onClick={() => setModal(null)}>Done</button></div></Modal>}
      {modal?.t === 'view' && <Modal title={modal.e.name} onClose={() => setModal(null)}><dl className="grid grid-cols-3 gap-2 text-sm">{[['Employee ID', modal.e.employeeId], ['Email', modal.e.email], ['Phone', modal.e.phone], ['Status', modal.e.archived ? 'Archived' : modal.e.isActive ? 'Active' : 'Disabled'], ['Face', modal.e.faceRegistered ? 'Registered' : 'Not registered'], ['Created', fmtDate(modal.e.createdAt.slice(0, 10))]].map(([k, v]) => <><dt key={k} className="font-semibold text-slate-500">{k}</dt><dd key={k + 'v'} className="col-span-2 break-all">{v}</dd></>)}</dl>
        {!modal.e.archived && <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-ghost" onClick={() => run(async () => { const { data } = await api.post(`/employees/${modal.e.id}/reset-password`); setModal({ t: 'created', d: { employee: modal.e, temporaryPassword: data.temporaryPassword } }); }, 'Password reset')}><FiKey /> Reset password</button>
          {modal.e.faceRegistered && <button className="btn btn-ghost text-red-600" onClick={() => setModal({ t: 'delface', e: modal.e })}><FiCamera /> Delete face data</button>}</div>}</Modal>}
      {modal?.t === 'toggle' && <Confirm danger={modal.e.isActive} busy={busy} title={modal.e.isActive ? 'Disable employee?' : 'Enable employee?'} text={modal.e.isActive ? `${modal.e.name} will be logged out and unable to submit anything.` : `${modal.e.name} will be able to log in again.`} onNo={() => setModal(null)} onYes={() => run(() => api.patch(`/employees/${modal.e.id}/status`, { isActive: !modal.e.isActive }), 'Status updated')} />}
      {modal?.t === 'delete' && <Confirm busy={busy} title="Delete employee?" text={`${modal.e.name} (${modal.e.employeeId}) will be archived. Historical sprint and attendance records are kept and the ID is never reused.`} onNo={() => setModal(null)} onYes={() => run(() => api.delete(`/employees/${modal.e.id}`), 'Employee archived')} />}
      {modal?.t === 'delface' && <Confirm busy={busy} title="Delete face data?" text="The registered face photos and embeddings will be permanently removed. The employee must register again." onNo={() => setModal(null)} onYes={() => run(() => api.delete(`/employees/${modal.e.id}/face`), 'Face data deleted')} />}
    </div>
  );
}
