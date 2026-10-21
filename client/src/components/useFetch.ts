import { useCallback, useEffect, useState } from 'react';
import { api, errMsg } from '../api';
export function useFetch<T = any>(url: string | null, params?: any) {
  const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(!!url); const [error, setError] = useState('');
  const key = JSON.stringify(params);
  const load = useCallback(async () => {
    if (!url) return; setLoading(true); setError('');
    try { const { data } = await api.get(url, { params }); setData(data); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [url, key]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}
