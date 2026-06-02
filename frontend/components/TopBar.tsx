'use client';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TopBar({ title }: { title?: string }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const router = useRouter();
  const role = user?.role || 'EMPLOYEE';
  const searchPath = role === 'EMPLOYEE' ? '/employee/complaints' : role === 'ADMIN' ? '/admin/complaints' : '/handler/search';

  return (
    <header className="topbar">
      {title && <h1 style={{ fontSize:17, fontWeight:600, color:'#f1f5f9', flexShrink:0 }}>{title}</h1>}
      <div style={{ flex:1 }}/>
      {/* Search */}
      <div style={{ position:'relative', width:260 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#475569' }}/>
        <input
          className="input"
          placeholder="Search complaints..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && query.trim()) {
              router.push(`${searchPath}?q=${encodeURIComponent(query.trim())}`);
            }
          }}
          style={{ paddingLeft:34, height:36, fontSize:12.5 }}
        />
      </div>
      {/* Notification bell */}
      <button
        className="btn-icon"
        style={{ position:'relative' }}
        onClick={() => {
          const notifPath = role === 'EMPLOYEE' ? '/employee/notifications' : role === 'ADMIN' ? '/admin/audit' : '/handler/notifications';
          router.push(notifPath);
        }}
      >
        <Bell size={15}/>
        <span style={{
          position:'absolute', top:5, right:5, width:6, height:6,
          background:'var(--purple)', borderRadius:'50%', border:'1.5px solid var(--bg-primary)'
        }} className="animate-pulse-dot"/>
      </button>
      {/* Avatar */}
      <div style={{
        width:34, height:34, borderRadius:9, flexShrink:0,
        background:'linear-gradient(135deg,var(--purple),var(--purple-light))',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:13, fontWeight:700, color:'white'
      }}>
        {(user?.email?.[0] || 'U').toUpperCase()}
      </div>
    </header>
  );
}
