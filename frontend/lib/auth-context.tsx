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
    import('@/lib/api').then(({ getMe }) => {
      getMe()
        .then(({ data }) => {
          setUser({
            user_id: data.id,
            role: data.role,
            tenant_id: data.tenant_id,
            tenant_name: data.department_name, // Using department as fallback or null
            email: data.email,
            name: data.name
          });
          setToken("cookie"); // dummy token to indicate logged in
        })
        .catch(() => {
          setUser(null);
          setToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await apiLogin(email, password);
    setUser({
      user_id: data.user_id,
      role: data.role,
      tenant_id: data.tenant_id,
      tenant_name: data.tenant_name,
      email: data.email || email,
      name: data.name
    });
    setToken("cookie");
  };

  const logout = () => {
    apiLogout().catch(() => {});
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
