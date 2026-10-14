import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogIn, FiUser, FiLock } from 'react-icons/fi';
import { useAuth } from '../auth';
import { errMsg } from '../api';
export default function Login() {
  const { login } = useAuth(); const nav = useNavigate();
  const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const u = await login(id.trim(), pw); nav(u.mustChangePassword ? '/change-password' : u.role === 'admin' ? '/admin' : '/app'); }
    catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="h-20 w-20 border border-crimson-200/70 bg-white p-2">
            <img src="/assets/images/logo.jpeg" alt="Growthora logo" className="h-full w-full object-contain" />
          </div>
          <div><div className="text-2xl font-extrabold text-crimson-700">Growthora</div><div className="text-sm text-slate-500">Sprint &amp; Attendance</div></div>
        </div>
        <div>
          <label className="label" htmlFor="employee-id">Employee ID</label>
          <div className="relative">
            <FiUser aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
            <input id="employee-id" className="input input-with-icon" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. Growthora261" required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <FiLock aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
            <input id="password" className="input input-with-icon" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
        </div>
        {err && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <button className="btn btn-primary w-full" disabled={busy}><FiLogIn /> {busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
