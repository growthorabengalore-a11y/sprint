import { useEffect, useState } from 'react';
import { api } from '../../api';
import { ClientRecord } from './clientTypes';

export default function ClientLogo({ client }: { client: ClientRecord }) {
  const [src, setSrc] = useState('');
  const attachment = client.attachment;

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setSrc('');
    if (!attachment || !attachment.mimeType.startsWith('image/')) return () => { active = false; };
    api.get(attachment.url, { responseType: 'blob' }).then(({ data }) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(data);
      setSrc(objectUrl);
    }).catch(() => {
      if (active) setSrc('');
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [client.id, client.updatedAt, attachment?.url]);

  if (!attachment) return <span className="text-slate-400">—</span>;
  if (attachment.mimeType === 'application/pdf') return <span className="rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700">PDF</span>;
  return src
    ? <img src={src} alt={`${client.companyName} logo`} className="h-10 w-10 rounded border border-slate-200 bg-white object-contain" />
    : <span className="inline-block h-10 w-10 animate-pulse rounded bg-slate-100" aria-label="Loading logo" />;
}
