'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import ClientDate from '@/components/ClientDate';
import { getMyComplaints } from '@/lib/api';
import { FileText } from 'lucide-react';

const TABS = ['', 'PENDING', 'IN_PROGRESS', 'SOLVED'];
const TAB_LABELS = ['All', 'Pending', 'In Progress', 'Resolved'];

export default function EmployeeComplaints() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');

  useEffect(() => {
    setLoading(true);
    getMyComplaints({ status: tab || undefined, page_size: 100 })
      .then(r => setComplaints(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <DashboardLayout title="My Complaints">
      <div className="tab-bar" style={{ marginBottom:20, maxWidth:420 }}>
        {TABS.map((t, i) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABELS[i]}
          </button>
        ))}
      </div>

      <div className="glass" style={{ padding:24 }}>
        {loading ? (
          <div className="empty-state"><div className="spinner"/></div>
        ) : complaints.length === 0 ? (
          <div className="empty-state"><FileText size={40}/><p>No complaints found</p></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Department</th><th>Date</th></tr></thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id} style={{ cursor:'pointer' }} onClick={() => router.push(`/employee/complaints/${c.id}`)}>
                    <td>
                      <div style={{ fontWeight:500, color:'#e2e8f0' }}>{c.title}</div>
                      <div style={{ fontSize:11, color:'var(--purple-light)', marginTop:2 }}>#{c.id.slice(0,8)}</div>
                    </td>
                    <td><StatusBadge status={c.status}/></td>
                    <td>{c.assigned_to_user_id ? <PriorityBadge priority={c.priority_level}/> : <span style={{ color:'#475569' }}>—</span>}</td>
                    <td style={{ fontSize:13, color:'#94a3b8' }}>{c.primary_department || '—'}</td>
                    <td style={{ fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}><ClientDate date={c.created_at} showTime={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
