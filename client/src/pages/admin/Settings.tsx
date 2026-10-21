import { useEffect, useState } from 'react';
import { FiSave, FiKey } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { api, errMsg } from '../../api';
import { useFetch } from '../../components/useFetch';
import { toast, ErrorBox, Skeleton } from '../../components/ui';
import { minToHHMM, hhmmToMin, fmtDate } from '../../utils/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export default function Settings() {
  const { data, loading, error, reload } = useFetch('/settings');
  const audit = useFetch('/settings/audit');
  const [s, setS] = useState<any>(null); const [hol, setHol] = useState(''); const [busy, setBusy] = useState(false); const nav = useNavigate();
  useEffect(() => { if (data) { setS(data.settings); setHol((data.settings.holidays || []).join('\n')); } }, [data]);
  if (error) return <ErrorBox text={error} onRetry={reload} />;
  if (loading || !s) return <Skeleton className="h-64 w-full" />;
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  const time = (k: string, label: string) => <div><label className="label">{label}</label><input type="time" className="input" value={minToHHMM(s[k])} onChange={(e) => e.target.value && set(k, hhmmToMin(e.target.value))} /></div>;
  const num = (k: string, label: string, step = 1) => <div><label className="label">{label}</label><input type="number" step={step} className="input" value={s[k]} onChange={(e) => set(k, Number(e.target.value))} /></div>;
  const save = async () => {
    setBusy(true);
    try { const holidays = hol.split(/\s+/).filter(Boolean); const { data } = await api.put('/settings', { ...s, holidays }); setS(data.settings); toast('Settings saved'); } catch (e) { toast(errMsg(e), 'err'); } finally { setBusy(false); }
  };
  const Sec = ({ t, children }: any) => <section className="card p-4"><h2 className="mb-3 font-bold">{t}</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div></section>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">Settings</h1><button className="btn btn-primary" disabled={busy} onClick={save}><FiSave /> {busy ? 'Saving…' : 'Save settings'}</button></div>
      <Sec t="General &amp; calendar">
        <div><label className="label">Timezone (IANA)</label><input className="input" value={s.timezone} onChange={(e) => set('timezone', e.target.value)} /></div>
        <div><label className="label">Week starts on</label><select className="input" value={s.weekStartDay} onChange={(e) => set('weekStartDay', +e.target.value)}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
        <div className="sm:col-span-2 lg:col-span-3"><label className="label">Working days</label><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <label key={d} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={s.workingDays.includes(i)} onChange={(e) => set('workingDays', e.target.checked ? [...s.workingDays, i] : s.workingDays.filter((x: number) => x !== i))} />{d}</label>)}</div></div>
        <div className="sm:col-span-2 lg:col-span-3"><label className="label">Holidays (one YYYY-MM-DD per line)</label><textarea className="input" rows={3} value={hol} onChange={(e) => setHol(e.target.value)} /></div>
      </Sec>
      <Sec t="Sprint">
        <div><label className="label">Performance model</label><select className="input" value={s.performanceModel} onChange={(e) => set('performanceModel', e.target.value)}><option value="projection">Projection vs achieved (default)</option><option value="fixed">Fixed daily targets</option></select></div>
        {s.performanceModel === 'fixed' && ['talkMinutes', 'leads', 'payments'].map((k) => <div key={k}><label className="label">Target: {k}</label><input type="number" className="input" value={s.fixedTargets[k]} onChange={(e) => set('fixedTargets', { ...s.fixedTargets, [k]: Number(e.target.value) })} /></div>)}
        {time('workStartMinutes', 'Day starts / morning sprint & check-in open (daily rollover)')}
      </Sec>
      <Sec t="Attendance">
        {time('lateThresholdMinutes', 'Late threshold (check-in after)')}
        {num('presentMinMinutes', 'Present: min minutes (default 420 = 7h)')}{num('halfDayMinMinutes', 'Half day: min minutes (default 180 = 3h)')}{num('halfDayMaxMinutes', 'Half day: max minutes (default 360 = 6h)')}{num('fullDayMinutes', 'Full-day hours (minutes)')}
        {num('faceMatchThreshold', 'Face match threshold (distance, lower = stricter)', 0.01)}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.requireLiveness} onChange={(e) => set('requireLiveness', e.target.checked)} /> Require liveness challenge</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.correctionsAllowed} onChange={(e) => set('correctionsAllowed', e.target.checked)} /> Allow admin attendance corrections</label>
        {num('biometricRetentionDays', 'Biometric retention (days)')}
      </Sec>
      <Sec t="Security">{num('maxLoginAttempts', 'Max failed login attempts')}{num('lockMinutes', 'Lock duration (minutes)')}
        <div className="flex items-end"><button className="btn btn-ghost" onClick={() => nav('/change-password')}><FiKey /> Change my password</button></div></Sec>
      <section className="card overflow-x-auto"><div className="p-3 font-bold">Audit log (latest 50)</div><table className="w-full"><thead><tr><th className="th">When</th><th className="th">Actor</th><th className="th">Action</th><th className="th">Target</th></tr></thead>
        <tbody>{audit.data?.items.map((a: any) => <tr key={a._id}><td className="td whitespace-nowrap">{fmtDate(a.createdAt.slice(0, 10))} {new Date(a.createdAt).toLocaleTimeString('en-IN')}</td><td className="td">{a.actorLabel}</td><td className="td">{a.action}</td><td className="td break-all">{a.target}</td></tr>)}</tbody></table></section>
    </div>
  );
}
