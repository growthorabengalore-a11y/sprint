import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, TOKEN_KEY } from './api';
type U = { id: string; name: string; employeeId: string; email: string; phone: string; role: 'admin' | 'employee'; faceRegistered: boolean; mustChangePassword: boolean } | null;
const Ctx = createContext<any>(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<U>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => { try { const { data } = await api.get('/auth/me'); setUser(data.user); } catch { setUser(null); } };
  useEffect(() => { (localStorage.getItem(TOKEN_KEY) ? refresh() : Promise.resolve()).finally(() => setLoading(false)); }, []);
  const login = async (employeeId: string, password: string) => { const { data } = await api.post('/auth/login', { employeeId, password }); localStorage.setItem(TOKEN_KEY, data.token); setUser(data.user); return data.user; };
  const setSession = (token: string, u: U) => { localStorage.setItem(TOKEN_KEY, token); setUser(u); };
  const logout = async () => { try { await api.post('/auth/logout'); } catch { /* ignore */ } localStorage.removeItem(TOKEN_KEY); setUser(null); };
  return <Ctx.Provider value={{ user, loading, login, logout, refresh, setSession }}>{children}</Ctx.Provider>;
}
