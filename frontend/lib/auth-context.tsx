'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout } from '@/lib/api';

interface User {
  user_id: string; role: string; tenant_id: string; tenant_name?: string;
  email?: string; name?: string;
}
interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('access_token');
    const u = localStorage.getItem('user');
    if (t && u) { 
      setToken(t); 
      const parsedUser = JSON.parse(u);
      setUser(parsedUser); 
      
      // Sync from profile if missing tenant_name
      if (!parsedUser.tenant_name) {
        import('@/lib/api').then(({ getProfile }) => {
          getProfile().then(({ data }) => {
            const updatedUser = { ...parsedUser, tenant_name: data.tenant_name, name: data.name };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
          }).catch(() => {});
        });
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await apiLogin(email, password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    const u = { user_id: data.user_id, role: data.role, tenant_id: data.tenant_id, tenant_name: data.tenant_name, email };
    localStorage.setItem('user', JSON.stringify(u));
    setToken(data.access_token);
    setUser(u);
  };

  const logout = () => {
    const rt = localStorage.getItem('refresh_token');
    if (rt) apiLogout(rt).catch(() => {});
    localStorage.clear();
    setUser(null); setToken(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
