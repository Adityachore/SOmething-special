'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getNotifications, markNotificationRead } from '@/lib/api';
import ClientDate from '@/components/ClientDate';
import { Bell, Check, ExternalLink } from 'lucide-react';

export default function HandlerNotifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getNotifications({ page_size: 50 })
      .then(r => { setItems(r.data.items || []); setUnread(r.data.unread_count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <DashboardLayout title="Notifications">
      <div className="section-header" style={{ marginBottom:20 }}>
        <div><div className="section-title">Notifications</div>{unread > 0 && <div className="section-sub">{unread} unread</div>}</div>
      </div>
      {loading ? <div className="empty-state"><div className="spinner"/></div> : items.length === 0 ? (
        <div className="empty-state"><Bell size={40}/><p>No notifications</p></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {items.map(n => (
            <div key={n.id} className="glass" style={{ padding:'14px 18px', borderLeft: n.is_read ? '3px solid transparent' : '3px solid #8b5cf6', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight: n.is_read ? 400 : 600, color: n.is_read ? '#94a3b8' : '#e2e8f0' }}>{n.title}</div>
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <span className="badge" style={{ background:'rgba(139,92,246,0.1)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.2)', fontSize:10 }}>{n.type}</span>
                  <span style={{ fontSize:11, color:'#475569' }}><ClientDate date={n.created_at} /></span>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {!n.is_read && <button className="btn-icon" onClick={() => { markNotificationRead(n.id).then(load); }}><Check size={14}/></button>}
                {n.complaint_id && <button className="btn-icon" onClick={() => router.push(`/handler/complaints/${n.complaint_id}`)}><ExternalLink size={14}/></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
