'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { getOrgSetupStatus } from '@/lib/api';

export default function DashboardLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    // If user is admin, check if setup wizard is completed
    if (user.role === 'ORG_ADMIN' || user.role === 'ADMIN') {
      getOrgSetupStatus()
        .then(({ data }) => {
          if (!data.profile_completed || !data.departments_configured || !data.key_roles_configured) {
            router.push('/org-setup');
          }
        })
        .catch((err) => {
          console.error('Error fetching setup status:', err);
        });
    }
  }, [user, loading, router]);


  if (loading || !user) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <TopBar title={title} />
        <div className="page-body">
          {children}
        </div>
      </div>
    </div>
  );
}
