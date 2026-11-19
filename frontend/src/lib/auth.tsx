import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, tokenStore } from "./api";
import { Role, User } from "./types";

interface Ctx {
  user: User | null; ready: boolean;
  login: (role: Role, email: string, password: string) => Promise<User>;
  register: (role: Role, data: Record<string, any>) => Promise<{ pending?: boolean; message?: string; user?: User }>;
  logout: () => void; setUser: (u: User) => void;
}
const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    api.get<User>("/auth/me").then(setUser).catch(() => tokenStore.clear()).finally(() => setReady(true));
  }, []);
  useEffect(() => { window.addEventListener("raise:logout", logout); return () => window.removeEventListener("raise:logout", logout); }, [logout]);

  const login = async (role: Role, email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password, role });
    tokenStore.set(r.access_token); setUser(r.user); return r.user as User;
  };
  const register = async (role: Role, data: Record<string, any>) => {
    const r = await api.post(`/auth/register/${role}`, data);
    if (r.pending) return { pending: true, message: r.message };
    tokenStore.set(r.access_token); setUser(r.user); return { user: r.user as User };
  };
  return <AuthCtx.Provider value={{ user, ready, login, register, logout, setUser }}>{children}</AuthCtx.Provider>;
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="grid min-h-screen place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-royal border-t-transparent" /></div>;
  if (!user) return <Navigate to={`/${role}/login`} state={{ from: loc.pathname }} replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}
