'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  ORG_ADMIN: '/admin',
  CMD: '/handler',
  HR: '/handler',
  EMPLOYEE: '/employee',
};

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    router.replace(ROLE_HOME[user.role] || '/employee');
  }, [user, loading, router]);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  );
}
