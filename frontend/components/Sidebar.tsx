'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, FileText, Search, Bell, Users, BarChart3,
  ClipboardList, Settings, LogOut, Shield, ChevronRight, PlusCircle
} from 'lucide-react';

const ROLE_MENUS: Record<string, { href: string; icon: React.ReactNode; label: string }[]> = {
  EMPLOYEE: [
    { href: '/employee', icon: <LayoutDashboard size={16}/>, label: 'Dashboard' },
    { href: '/employee/complaints', icon: <FileText size={16}/>, label: 'My Complaints' },
    { href: '/employee/submit', icon: <PlusCircle size={16}/>, label: 'Submit Complaint' },
    { href: '/employee/notifications', icon: <Bell size={16}/>, label: 'Notifications' },
  ],
  CMD: [
    { href: '/handler', icon: <LayoutDashboard size={16}/>, label: 'Dashboard' },
    { href: '/handler/complaints', icon: <FileText size={16}/>, label: 'Complaints' },
    { href: '/handler/search', icon: <Search size={16}/>, label: 'Search' },
    { href: '/handler/notifications', icon: <Bell size={16}/>, label: 'Notifications' },
  ],
  HR: [
    { href: '/handler', icon: <LayoutDashboard size={16}/>, label: 'Dashboard' },
    { href: '/handler/complaints', icon: <FileText size={16}/>, label: 'HR Cases' },
    { href: '/handler/search', icon: <Search size={16}/>, label: 'Search' },
    { href: '/handler/notifications', icon: <Bell size={16}/>, label: 'Notifications' },
  ],
  ADMIN: [
    { href: '/admin', icon: <LayoutDashboard size={16}/>, label: 'Overview' },
    { href: '/admin/complaints', icon: <FileText size={16}/>, label: 'All Complaints' },
    { href: '/admin/users', icon: <Users size={16}/>, label: 'Users' },
    { href: '/admin/analytics', icon: <BarChart3 size={16}/>, label: 'Analytics' },
    { href: '/admin/audit', icon: <ClipboardList size={16}/>, label: 'Audit Logs' },
    { href: '/admin/settings', icon: <Settings size={16}/>, label: 'Settings' },
  ],
};

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  EMPLOYEE: { label: 'Employee', color: '#34d399' },
  CMD:      { label: 'Manager', color: '#60a5fa' },
  HR:       { label: 'HR Manager', color: '#a78bfa' },
  ADMIN:    { label: 'Administrator', color: '#f59e0b' },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const role = user?.role || 'EMPLOYEE';
  const menu = ROLE_MENUS[role] || [];
  const roleInfo = ROLE_LABEL[role] || ROLE_LABEL.EMPLOYEE;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 8px', marginBottom:24 }}>
        <div style={{
          width:34, height:34, borderRadius:10,
          background:'linear-gradient(135deg,#8b5cf6,#3b82f6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 0 20px rgba(139,92,246,0.3)', flexShrink:0
        }}>
          <Shield size={17} color="white"/>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', lineHeight:1.2 }}>AI Complaint</div>
          <div style={{ fontSize:10, fontWeight:600, color:'#8b5cf6', letterSpacing:'0.06em' }}>ANALYZER</div>
        </div>
      </div>

      {/* User pill */}
      <div style={{
        background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.18)',
        borderRadius:12, padding:'10px 12px', marginBottom:20
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{
            width:32, height:32, borderRadius:9, flexShrink:0,
            background:'linear-gradient(135deg,#8b5cf6,#6366f1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700, color:'white'
          }}>
            {(user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.email?.split('@')[0] || 'User'}
            </div>
            <div style={{ fontSize:10.5, fontWeight:500, color:roleInfo.color, marginTop:2 }}>
              {roleInfo.label}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
        {menu.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
              {item.icon}
              <span style={{ flex:1 }}>{item.label}</span>
              {isActive && <ChevronRight size={13} style={{ opacity:0.5 }}/>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button onClick={logout} className="nav-item" style={{ border:'1px solid rgba(239,68,68,0.12)', marginTop:8 }}>
        <LogOut size={15} style={{ color:'#64748b' }}/> <span style={{ flex:1 }}>Sign Out</span>
      </button>
    </aside>
  );
}
