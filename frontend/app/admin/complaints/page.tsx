'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { PriorityBadge, StatusBadge, HRBadge } from '@/components/Badges';
import { getAllComplaints } from '@/lib/api';
import ClientDate from '@/components/ClientDate';
import { Eye, RefreshCw, FileText } from 'lucide-react';

export default function AdminComplaints() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const load = () => {
    setLoading(true);
    getAllComplaints({ status: filterStatus || undefined, priority: filterPriority || undefined, page_size: 100 })
      .then(r => setComplaints(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [filterStatus, filterPriority]);

  return (
    <DashboardLayout title="All Complaints">
      <div className="glass" style={{ padding:24 }}>
        <div className="section-header">
          <div className="section-title">All Complaints ({complaints.length})</div>
          <div style={{ display:'flex', gap:8 }}>
            <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize:12, height:36, width:130 }}>
              <option value="">All Status</option><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="SOLVED">Solved</option><option value="REJECTED">Rejected</option>
            </select>
            <select className="select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ fontSize:12, height:36, width:130 }}>
              <option value="">All Priority</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
            </select>
            <button className="btn-icon" onClick={load}><RefreshCw size={14}/></button>
          </div>
        </div>
        {loading ? <div className="empty-state"><div className="spinner"/></div> : complaints.length === 0 ? (
          <div className="empty-state"><FileText size={40}/><p>No complaints</p></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>ID / Title</th><th>Dept</th><th>Priority</th><th>Status</th><th>HR</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id}>
                    <td><div style={{ fontWeight:500, color:'#e2e8f0' }}>{c.title}</div><div style={{ fontSize:11, color:'#8b5cf6' }}>#{c.id.slice(0,8)}</div></td>
                    <td style={{ fontSize:13, color:'#94a3b8' }}>{c.primary_department||'—'}</td>
                    <td><PriorityBadge priority={c.priority_level}/></td>
                    <td><StatusBadge status={c.status}/></td>
                    <td><HRBadge sensitive={c.is_hr_sensitive}/></td>
                    <td style={{ fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}><ClientDate date={c.created_at} showTime={false} /></td>
                    <td><button className="btn-icon" onClick={() => router.push(`/admin/complaints/${c.id}`)}><Eye size={13}/></button></td>
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
