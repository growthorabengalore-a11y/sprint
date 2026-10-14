import { useEffect, useRef, useState } from 'react';
import { loadModels, detectAll, qualityIssue, snapshot, runLiveness, randomChallenge, challengeText } from '../face';
import { api, errMsg } from '../api';
import { Modal } from './ui';

function useCamera() {
  const ref = useRef<HTMLVideoElement>(null); const [ready, setReady] = useState(false); const [err, setErr] = useState('');
  useEffect(() => {
    let stream: MediaStream | null = null; let dead = false;
    (async () => {
      try { await loadModels(); stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (dead) { stream.getTracks().forEach((t) => t.stop()); return; } if (ref.current) { ref.current.srcObject = stream; await ref.current.play(); setReady(true); } }
      catch (e: any) { setErr(e?.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access in your browser settings and retry.' : e?.message || 'Camera unavailable'); }
    })();
    return () => { dead = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  return { ref, ready, err };
}
const Video = ({ vref }: any) => <div className="overflow-hidden rounded-xl bg-black"><video ref={vref} playsInline muted className="aspect-[4/3] w-full -scale-x-100 object-cover" /></div>;

/** Registration: capture 3 quality samples, consent, upload. */
export function RegisterFaceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { ref, ready, err } = useCamera(); const [samples, setSamples] = useState<{ blob: Blob; d: number[] }[]>([]); const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false); const [consent, setConsent] = useState(false);
  const capture = async () => {
    const v = ref.current!; setBusy(true); setMsg('');
    try { const faces = await detectAll(v); const issue = qualityIssue(v, faces); if (issue) { setMsg(issue); return; }
      const blob = await snapshot(v);
      setSamples((s) => [...s, { blob, d: Array.from(faces[0].descriptor as Float32Array) }]); }
    catch (e) { setMsg(errMsg(e)); } finally { setBusy(false); }
  };
  const submit = async () => {
    setBusy(true); setMsg('');
    try { const fd = new FormData(); samples.forEach((s, i) => fd.append('images', s.blob, `s${i}.jpg`)); fd.append('descriptors', JSON.stringify(samples.map((s) => s.d))); fd.append('consent', 'true');
      await api.post('/attendance/register-face', fd); onDone(); }
    catch (e) { setMsg(errMsg(e)); setSamples([]); } finally { setBusy(false); }
  };
  return (
    <Modal title="Register my face" onClose={onClose}>
      {err ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div> : <>
        <Video vref={ref} />
        <ul className="my-2 list-disc pl-5 text-xs text-slate-600"><li>Face the camera in good, even lighting</li><li>Remove cap, mask or sunglasses</li><li>Only one person in frame</li><li>Hold steady while capturing</li></ul>
        <div className="my-2 text-sm font-semibold">Samples captured: {samples.length} / 3 (minimum 2)</div>
        {msg && <div className="mb-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{msg}</div>}
        <label className="mb-3 flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I consent to Growthora storing my face photos and face embeddings on its own server for attendance verification. I can ask the admin to delete them.</label>
        <div className="flex flex-wrap gap-2"><button className="btn btn-ghost" disabled={busy || !ready || samples.length >= 3} onClick={capture}>{busy ? 'Checking…' : 'Capture sample'}</button>
          {samples.length > 0 && <button className="btn btn-ghost" disabled={busy} onClick={() => setSamples([])}>Retry</button>}
          <button className="btn btn-primary ml-auto" disabled={busy || samples.length < 2 || !consent} onClick={submit}>Save &amp; continue</button></div></>}
    </Modal>
  );
}
/** Check-in / check-out verification: liveness prompt -> quality check -> embedding -> server decides. */
export function VerifyModal({ mode, requireLiveness, onClose, onDone }: { mode: 'check-in' | 'check-out'; requireLiveness: boolean; onClose: () => void; onDone: (r: any) => void }) {
  const { ref, ready, err } = useCamera(); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [prompt, setPrompt] = useState('');
  const go = async () => {
    const v = ref.current!; setBusy(true); setMsg('');
    try {
      let live = false;
      if (requireLiveness) { const ch = randomChallenge(); setPrompt(challengeText(ch)); live = await runLiveness(v, ch); setPrompt(''); if (!live) { setMsg('Liveness check failed. Try again.'); return; } }
      let faces: any[] = [], issue: string | null = 'x';
      for (let i = 0; i < 8 && issue; i++) { faces = await detectAll(v); issue = qualityIssue(v, faces); if (issue) await new Promise((r) => setTimeout(r, 250)); }
      if (issue) { setMsg(issue); return; }
      const { data } = await api.post(`/attendance/${mode}`, { descriptor: Array.from(faces[0].descriptor as Float32Array), liveness: live });
      onDone(data);
    } catch (e) { setMsg(errMsg(e)); } finally { setBusy(false); setPrompt(''); }
  };
  return (
    <Modal title={mode === 'check-in' ? 'Check in' : 'Check out'} onClose={onClose}>
      {err ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div> : <>
        <Video vref={ref} />
        {prompt && <div className="my-2 rounded-lg bg-crimson-100 p-3 text-center text-lg font-bold text-crimson-700">{prompt}</div>}
        {msg && <div className="my-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{msg} <span className="block text-xs">Still failing? Ask your admin for manual verification.</span></div>}
        <button className="btn btn-primary mt-3 w-full" disabled={busy || !ready} onClick={go}>{busy ? 'Verifying…' : !ready ? 'Starting camera…' : mode === 'check-in' ? 'Verify & check in' : 'Verify & check out'}</button></>}
    </Modal>
  );
}
