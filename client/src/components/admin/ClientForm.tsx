import { useState } from 'react';
import { api, errMsg } from '../../api';
import { ClientRecord } from './clientTypes';

type Props = {
  initial?: ClientRecord | null;
  onSaved: (client?: ClientRecord) => void;
  onCancel?: () => void;
  submitLabel?: string;
  onSubmit?: (body: FormData) => Promise<void>;
};

export default function ClientForm({ initial, onSaved, onCancel, submitLabel = 'Save client', onSubmit }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [values, setValues] = useState({
    name: initial?.name || '',
    companyName: initial?.companyName || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    browser: ['Mozilla Firefox', 'Safari', 'Google Chrome'].includes(initial?.browser || '') ? initial?.browser || '' : '',
    filedDate: initial?.filedDate || new Date().toISOString().slice(0, 10),
  });
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^[6-9]\d{9}$/.test(values.phone)) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) { setError('Enter a valid email address.'); return; }
    setBusy(true);
    const body = new FormData();
    Object.entries(values).forEach(([key, value]) => body.append(key, value));
    try {
      if (onSubmit) {
        await onSubmit(body);
        onSaved();
      } else {
        const response = initial
          ? await api.put(`/clients/${initial.id}`, body)
          : await api.post('/clients', body);
        onSaved(response.data.client);
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Client name"><input className="input" required maxLength={100} value={values.name} onChange={(e) => update('name', e.target.value)} /></Field>
        <Field label="Company name"><input className="input" required maxLength={150} value={values.companyName} onChange={(e) => update('companyName', e.target.value)} /></Field>
        <Field label="Phone number (10 digits)"><input className="input" type="tel" inputMode="numeric" required maxLength={10} pattern="[6-9][0-9]{9}" value={values.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></Field>
        <Field label="Email"><input className="input" type="email" required maxLength={200} value={values.email} onChange={(e) => update('email', e.target.value)} /></Field>
        <Field label="Browser">
          <select className="input" required value={values.browser} onChange={(e) => update('browser', e.target.value)}>
            <option value="" disabled>Select a browser</option>
            <option value="Mozilla Firefox">Mozilla Firefox</option>
            <option value="Safari">Safari</option>
            <option value="Google Chrome">Google Chrome</option>
          </select>
        </Field>
        <Field label="Filed date (DD/MM/YYYY)"><input className="input" type="date" required value={values.filedDate} onChange={(e) => update('filedDate', e.target.value)} /></Field>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0"><span className="label">{label}</span>{children}</label>;
}
