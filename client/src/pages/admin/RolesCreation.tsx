import { useState } from 'react';
import { api, errMsg } from '../../api';
import { useFetch } from '../../components/useFetch';
import { ErrorBox, Skeleton, toast } from '../../components/ui';

const pages = [
  ['dashboard', 'Dashboard'], ['champs', 'Champs'], ['sprint-reports', 'Sprint Reports'], ['performance', 'Performance Reports'],
  ['attendance', 'Attendance Dashboard'], ['attendance-reports', 'Attendance Reports'], ['clients', 'Clients'],
  ['client-data', 'Client Data'], ['team-target', 'Team Leader Target'], ['team-performance', 'Team Performance'], ['leads', 'Leads Management'], ['settings', 'Settings'],
];

export default function RolesCreation() {
  const { data, loading, error, reload } = useFetch('/roles/branches');
  const [branch, setBranch] = useState({ name: '', address: '', branchId: '', password: '' });
  const [hr, setHr] = useState({ name: '', branchId: '', employeeId: '', password: '' });
  const [operationTeam, setOperationTeam] = useState({ name: '', address: '', branchId: '', employeeId: '', password: '' });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [operationPermissions, setOperationPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState<'branch' | 'hr' | 'operations' | null>(null);

  const createBranch = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving('branch');
    try {
      await api.post('/roles/branches', branch);
      setBranch({ name: '', address: '', branchId: '', password: '' });
      toast('Branch created');
      reload();
    } catch (e) { toast(errMsg(e), 'err'); }
    finally { setSaving(null); }
  };
  const createHr = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving('hr');
    try {
      await api.post('/roles/hr', { ...hr, pagePermissions: permissions });
      setHr({ name: '', branchId: '', employeeId: '', password: '' });
      setPermissions([]);
      toast('HR account created');
    } catch (e) { toast(errMsg(e), 'err'); }
    finally { setSaving(null); }
  };
  const createOperationTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving('operations');
    try {
      await api.post('/roles/operations', { ...operationTeam, pagePermissions: operationPermissions });
      setOperationTeam({ name: '', address: '', branchId: '', employeeId: '', password: '' });
      setOperationPermissions([]);
      toast('Operation Team account created');
    } catch (e) { toast(errMsg(e), 'err'); }
    finally { setSaving(null); }
  };
  const togglePage = (page: string, checked: boolean) => setPermissions((selected) => checked
    ? [...selected, page]
    : selected.filter((item) => item !== page));
  const toggleOperationPage = (page: string, checked: boolean) => setOperationPermissions((selected) => checked
    ? [...selected, page]
    : selected.filter((item) => item !== page));

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Roles Creation</h1><p className="mt-1 text-sm text-slate-500">Create branch panels and assign HR access to selected pages.</p></div>
      <section className="card space-y-4 p-4">
        <div><h2 className="font-bold">Create Branch</h2><p className="text-sm text-slate-500">Each branch gets its own admin login and branch-scoped champs, attendance, and sprint data.</p></div>
        <form onSubmit={createBranch} className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="branch-name">Branch name</label><input id="branch-name" className="input" value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} required minLength={2} maxLength={100} /></div>
          <div><label className="label" htmlFor="branch-address">Branch address</label><input id="branch-address" className="input" value={branch.address} onChange={(e) => setBranch({ ...branch, address: e.target.value })} required minLength={3} maxLength={500} /></div>
          <div><label className="label" htmlFor="branch-id">Branch ID (login)</label><input id="branch-id" className="input" value={branch.branchId} onChange={(e) => setBranch({ ...branch, branchId: e.target.value })} required minLength={2} maxLength={60} pattern="[A-Za-z0-9._-]+" autoComplete="off" /></div>
          <div><label className="label" htmlFor="branch-password">Branch password</label><input id="branch-password" className="input" type="password" value={branch.password} onChange={(e) => setBranch({ ...branch, password: e.target.value })} required minLength={8} maxLength={100} autoComplete="new-password" /></div>
          <div className="sm:col-span-2"><button className="btn btn-primary" disabled={saving !== null}>{saving === 'branch' ? 'Creating…' : 'Create Branch'}</button><p className="mt-2 text-xs text-slate-500">Password must contain at least 8 characters, including a letter and a number.</p></div>
        </form>
      </section>

      <section className="card space-y-4 p-4">
        <div><h2 className="font-bold">Create HR</h2><p className="text-sm text-slate-500">Choose the branch and exactly which admin pages this HR account may access.</p></div>
        {error && <ErrorBox text={error} onRetry={reload} />}
        {loading && !data ? <Skeleton className="h-16 w-full" /> : (
          <form onSubmit={createHr} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="hr-name">HR name</label><input id="hr-name" className="input" value={hr.name} onChange={(e) => setHr({ ...hr, name: e.target.value })} required minLength={2} maxLength={100} /></div>
              <div><label className="label" htmlFor="hr-branch">HR branch</label><select id="hr-branch" className="input" value={hr.branchId} onChange={(e) => setHr({ ...hr, branchId: e.target.value })} required><option value="">Select a branch</option>{data?.items?.map((item: any) => <option key={item._id} value={item._id}>{item.name} ({item.branchId})</option>)}</select></div>
              <div><label className="label" htmlFor="hr-id">HR ID (login)</label><input id="hr-id" className="input" value={hr.employeeId} onChange={(e) => setHr({ ...hr, employeeId: e.target.value })} required minLength={2} maxLength={60} pattern="[A-Za-z0-9._-]+" autoComplete="off" /></div>
              <div><label className="label" htmlFor="hr-password">HR password</label><input id="hr-password" className="input" type="password" value={hr.password} onChange={(e) => setHr({ ...hr, password: e.target.value })} required minLength={8} maxLength={100} autoComplete="new-password" /></div>
            </div>
            <fieldset>
              <legend className="label">Pages HR can access</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={permissions.includes(key)} onChange={(e) => togglePage(key, e.target.checked)} />{label}
                </label>)}
              </div>
              {!permissions.length && <p className="mt-1 text-xs text-amber-700">Select at least one page.</p>}
            </fieldset>
            <button className="btn btn-primary" disabled={saving !== null || !data?.items?.length || !permissions.length}>{saving === 'hr' ? 'Creating…' : 'Create HR'}</button>
            {!data?.items?.length && <p className="text-sm text-amber-700">Create a branch before creating an HR account.</p>}
          </form>
        )}
      </section>

      <section className="card space-y-4 p-4">
        <div><h2 className="font-bold">Create Operation Team</h2><p className="text-sm text-slate-500">Operation Team members can access only the pages selected below, and only for their assigned branch.</p></div>
        {error && <ErrorBox text={error} onRetry={reload} />}
        {loading && !data ? <Skeleton className="h-16 w-full" /> : (
          <form onSubmit={createOperationTeam} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="operation-name">Name</label><input id="operation-name" className="input" value={operationTeam.name} onChange={(e) => setOperationTeam({ ...operationTeam, name: e.target.value })} required minLength={2} maxLength={100} /></div>
              <div><label className="label" htmlFor="operation-address">Address</label><input id="operation-address" className="input" value={operationTeam.address} onChange={(e) => setOperationTeam({ ...operationTeam, address: e.target.value })} required minLength={3} maxLength={500} /></div>
              <div><label className="label" htmlFor="operation-branch">Branch name</label><select id="operation-branch" className="input" value={operationTeam.branchId} onChange={(e) => setOperationTeam({ ...operationTeam, branchId: e.target.value })} required><option value="">Select a branch</option>{data?.items?.map((item: any) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></div>
              <div><label className="label" htmlFor="operation-id">ID (login)</label><input id="operation-id" className="input" value={operationTeam.employeeId} onChange={(e) => setOperationTeam({ ...operationTeam, employeeId: e.target.value })} required minLength={2} maxLength={60} pattern="[A-Za-z0-9._-]+" autoComplete="off" /></div>
              <div><label className="label" htmlFor="operation-password">Password</label><input id="operation-password" className="input" type="password" value={operationTeam.password} onChange={(e) => setOperationTeam({ ...operationTeam, password: e.target.value })} required minLength={8} maxLength={100} autoComplete="new-password" /></div>
            </div>
            <fieldset>
              <legend className="label">Pages Operation Team can access</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={operationPermissions.includes(key)} onChange={(e) => toggleOperationPage(key, e.target.checked)} />{label}
                </label>)}
              </div>
              {!operationPermissions.length && <p className="mt-1 text-xs text-amber-700">Select at least one page.</p>}
            </fieldset>
            <button className="btn btn-primary" disabled={saving !== null || !data?.items?.length || !operationPermissions.length}>{saving === 'operations' ? 'Creating…' : 'Create Operation Team'}</button>
            {!data?.items?.length && <p className="text-sm text-amber-700">Create a branch before creating an Operation Team account.</p>}
          </form>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="p-4 font-bold">Branches</h2>
        {data?.items?.length ? <table className="w-full"><thead><tr>{['Branch', 'Address', 'Branch ID'].map((label) => <th key={label} className="th">{label}</th>)}</tr></thead>
          <tbody>{data.items.map((item: any) => <tr key={item._id}><td className="td font-semibold">{item.name}</td><td className="td">{item.address}</td><td className="td">{item.branchId}</td></tr>)}</tbody></table>
          : <p className="px-4 pb-4 text-sm text-slate-500">No branches created yet.</p>}
      </section>
    </div>
  );
}
