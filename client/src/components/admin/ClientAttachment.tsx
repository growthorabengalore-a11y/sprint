import { useEffect, useState } from 'react';
import { api } from '../../api';
import { ClientRecord } from './clientTypes';

export default function ClientAttachment({ client }: { client: ClientRecord }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const file = client.attachment;

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setSrc('');
    setError('');
    if (!file) return () => { active = false; };
    api.get(file.url, { params: { updatedAt: client.updatedAt }, responseType: 'blob' }).then(({ data }) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(data);
      setSrc(objectUrl);
    }).catch(() => {
      if (active) setError('Unable to load the uploaded file.');
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [client.id, client.updatedAt, file?.url]);

  if (!file) return <p className="text-sm text-slate-500">No logo or document uploaded.</p>;
  return (
    <div className="space-y-2">
      <div className="break-all text-sm font-semibold">{file.name}</div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!src && !error && <p className="text-sm text-slate-500">Loading attachment…</p>}
      {src && file.mimeType.startsWith('image/') && <img src={src} alt={`${client.companyName} logo`} className="max-h-72 max-w-full rounded-lg border border-slate-200 object-contain" />}
      {src && file.mimeType === 'application/pdf' && <iframe title={`${client.companyName} document`} src={src} className="h-96 w-full rounded-lg border border-slate-200" />}
      {src && <a className="btn btn-ghost" href={src} download={file.name}>Download attachment</a>}
    </div>
  );
}
