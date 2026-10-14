import { useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { FiX, FiAlertCircle, FiInbox, FiChevronDown } from 'react-icons/fi';

export function Skeleton({ className = 'h-6 w-24' }) { return <div className={`skeleton ${className}`} />; }
export function Empty({ text = 'No data' }) { return <div className="flex flex-col items-center gap-2 py-10 text-slate-500"><FiInbox size={28} /><span className="text-sm">{text}</span></div>; }
export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><FiAlertCircle /> <span className="flex-1">{text}</span>{onRetry && <button className="underline" onClick={onRetry}>Retry</button>}</div>;
}
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className={`card w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-b-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="font-bold">{title}</h3><button aria-label="Close" onClick={onClose} className="p-2"><FiX /></button></div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
export function Confirm({ title, text, onYes, onNo, danger = true, busy = false }: any) {
  return <Modal title={title} onClose={onNo}><p className="text-sm mb-4">{text}</p><div className="flex justify-end gap-2"><button className="btn btn-ghost" onClick={onNo}>Cancel</button><button disabled={busy} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onYes}>{busy ? 'Working…' : 'Confirm'}</button></div></Modal>;
}
// ---- toasts ----
type T = { id: number; msg: string; kind: 'ok' | 'err' };
const listeners = new Set<(t: T) => void>();
export const toast = (msg: string, kind: 'ok' | 'err' = 'ok') => listeners.forEach((l) => l({ id: Date.now() + Math.random(), msg, kind }));
export function ToastHost() {
  const [items, set] = useState<T[]>([]);
  useEffect(() => { const l = (t: T) => { set((x) => [...x, t]); setTimeout(() => set((x) => x.filter((y) => y.id !== t.id)), 4500); }; listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return <div className="fixed top-3 right-3 left-3 sm:left-auto z-[60] space-y-2">{items.map((t) => <div key={t.id} className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${t.kind === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>{t.msg}</div>)}</div>;
}
/** Searchable dropdown with optional manual entry. */
export function Combo({ options, value, onChange, placeholder, parseCustom, inputMode = 'text', disabled }: {
  options: { value: string; label: string }[]; value: string | null; onChange: (v: string | null) => void; placeholder?: string;
  parseCustom?: (text: string) => { value: string; label: string } | null; inputMode?: any; disabled?: boolean;
}) {
  const [text, setText] = useState(''); const [open, setOpen] = useState(false); const [custom, setCustom] = useState<{ value: string; label: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) || (custom && custom.value === value ? custom : null);
  useEffect(() => { setText(selected?.label || ''); }, [value]); // eslint-disable-line
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setText(selected?.label || ''); } }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [selected]);
  const q = text.trim().toLowerCase(); const qd = q.replace(/[^\d]/g, '');
  const filtered = useMemo(() => {
    if (!open || (selected && text === selected.label)) return options.slice(0, 80);
    return options.filter((o) => o.label.toLowerCase().includes(q) || (qd && o.value.includes(qd)) || (qd && o.label.replace(/[^\d]/g, '').includes(qd))).slice(0, 80);
  }, [open, text, options]); // eslint-disable-line
  const pick = (o: { value: string; label: string }) => { onChange(o.value); setText(o.label); setOpen(false); };
  const tryCustom = () => { const c = parseCustom?.(text); if (c) { setCustom(c); pick(c); return true; } return false; };
  const customPreview = open && q && parseCustom ? parseCustom(text) : null;
  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input className="input pr-9" disabled={disabled} inputMode={inputMode} placeholder={placeholder} value={text}
          onFocus={(e) => { setOpen(true); e.target.select(); }} onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (filtered[0] && !customPreview) pick(filtered[0]); else tryCustom(); } }} />
        <FiChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
      </div>
      {open && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {customPreview && !options.some((o) => o.value === customPreview.value) && <li className="cursor-pointer px-3 py-3 text-sm font-semibold text-crimson-700 hover:bg-crimson-50" onMouseDown={(e) => { e.preventDefault(); tryCustom(); }}>Use “{customPreview.label}”</li>}
          {filtered.map((o) => <li key={o.value} className={`cursor-pointer px-3 py-3 text-sm hover:bg-crimson-50 ${o.value === value ? 'bg-crimson-100 font-semibold' : ''}`} onMouseDown={(e) => { e.preventDefault(); pick(o); }}>{o.label}</li>)}
          {!filtered.length && !customPreview && <li className="px-3 py-3 text-sm text-slate-500">No match</li>}
        </ul>
      )}
    </div>
  );
}
export const StatusBadge = ({ s }: { s: string }) => {
  const c: Record<string, string> = { Present: 'bg-emerald-100 text-emerald-700', 'Half Day': 'bg-amber-100 text-amber-700', Absent: 'bg-red-100 text-red-700', 'In Progress': 'bg-blue-100 text-blue-700', 'Needs Review': 'bg-purple-100 text-purple-700',
    Calculated: 'bg-emerald-100 text-emerald-700', Incomplete: 'bg-amber-100 text-amber-700', 'No submission': 'bg-red-100 text-red-700', 'Pending payment confirmation': 'bg-orange-100 text-orange-700', 'Zero achievement': 'bg-red-100 text-red-700', 'No applicable metric': 'bg-slate-100 text-slate-600' };
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${c[s] || 'bg-slate-100 text-slate-700'}`}>{s}</span>;
};
export const parsePayment = (t: string) => {
  const n = Number(t.replace(/[₹,\s]/g, ''));
  if (!t.trim() || !/^[₹\d,.\s]+$/.test(t) || !Number.isFinite(n) || n < 0 || n > 100000000 || !Number.isInteger(n)) return null;
  return { value: String(n), label: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) };
};
export const parseLeads = (t: string) => { const n = Number(t.trim()); return /^\d+$/.test(t.trim()) && n <= 100000 ? { value: String(n), label: String(n) } : null; };
