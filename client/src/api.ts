import axios from 'axios';
const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://sprint-pnqh.onrender.com/api');
export const api = axios.create({ baseURL: apiBaseUrl, timeout: 30000 });
export const TOKEN_KEY = 'growthora_token';
api.interceptors.request.use((c) => { const t = localStorage.getItem(TOKEN_KEY); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !e.config.url?.includes('/auth/login')) { localStorage.removeItem(TOKEN_KEY); if (location.pathname !== '/login') location.href = '/login'; }
  if (e.response?.data?.code === 'MUST_CHANGE_PASSWORD' && location.pathname !== '/change-password') location.href = '/change-password';
  return Promise.reject(e);
});
export const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Something went wrong';
