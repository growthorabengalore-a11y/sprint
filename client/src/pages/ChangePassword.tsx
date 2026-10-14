import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import { toast } from '../components/ui';
const schema = z.object({ currentPassword: z.string().min(1, 'Required'), newPassword: z.string().min(8, 'Min 8 characters').regex(/[A-Za-z]/, 'Needs a letter').regex(/\d/, 'Needs a digit'), confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export default function ChangePassword() {
  const { user, setSession } = useAuth(); const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  if (!user) { nav('/login'); return null; }
  const on = async (v: any) => {
    try { const { data } = await api.post('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword }); setSession(data.token, data.user); toast('Password updated'); nav(data.user.role === 'admin' ? '/admin' : '/app'); }
    catch (e) { toast(errMsg(e), 'err'); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit(on)} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-lg font-bold">{user.mustChangePassword ? 'Set a new password' : 'Change password'}</h1>
        {user.mustChangePassword && <p className="text-sm text-slate-600">You are using a temporary password. Choose your own to continue.</p>}
        {(['currentPassword', 'newPassword', 'confirm'] as const).map((f) => (
          <div key={f}><label className="label">{f === 'currentPassword' ? 'Current / temporary password' : f === 'newPassword' ? 'New password' : 'Confirm new password'}</label>
            <input type="password" className="input" {...register(f)} /><p className="mt-1 text-xs text-red-600">{(errors as any)[f]?.message}</p></div>))}
        <button className="btn btn-primary w-full" disabled={isSubmitting}>Update password</button>
        {!user.mustChangePassword && <button type="button" className="btn btn-ghost w-full" onClick={() => nav(-1)}>Back</button>}
      </form>
    </div>
  );
}
