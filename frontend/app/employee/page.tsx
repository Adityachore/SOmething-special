'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import TableSkeleton from '@/components/TableSkeleton';
import StatCard from '@/components/StatCard';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import ClientDate from '@/components/ClientDate';
import { getMyComplaints } from '@/lib/api';
import { FileText, Clock, CheckCircle, AlertTriangle, Plus, Brain } from 'lucide-react';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true); setError('');
    getMyComplaints({ page_size: 50 })
      .then(r => setComplaints(r.data.items || []))
      .catch(() => setError('Failed to load your complaints. Please check your connection.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'PENDING').length,
    in_progress: complaints.filter(c => c.status === 'IN_PROGRESS' || c.status === 'WAITING_FOR_EMPLOYEE').length,
    solved: complaints.filter(c => c.status === 'SOLVED' || c.status === 'CLOSED').length,
  };

  return (
    <DashboardLayout title="My Dashboard">
      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Total Complaints" value={stats.total} icon={<FileText size={20}/>} color="purple"/>
        <StatCard label="Pending" value={stats.pending} icon={<Clock size={20}/>} color="amber"/>
        <StatCard label="In Progress" value={stats.in_progress} icon={<AlertTriangle size={20}/>} color="blue"/>
        <StatCard label="Resolved" value={stats.solved} icon={<CheckCircle size={20}/>} color="green"/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
        {/* Table */}
        <div className="glass" style={{ padding:24 }}>
          <div className="section-header">
            <div>
              <div className="section-title">My Complaints</div>
              <div className="section-sub">{complaints.length} total</div>
            </div>
            <button className="btn btn-primary" onClick={() => router.push('/employee/submit')}><Plus size={15}/> New Complaint</button>
          </div>
          {loading ? (
            <TableSkeleton cols={5} rows={5} />
          ) : complaints.length === 0 ? (
            <div className="empty-state">
              <FileText size={40}/>
              <p>No complaints yet</p>
              <button className="btn btn-primary" onClick={() => router.push('/employee/submit')} style={{ marginTop:8 }}>Submit your first complaint</button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>AI Summary</th><th>Date</th></tr></thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} onClick={() => router.push(`/employee/complaints/${c.id}`)} style={{ cursor:'pointer' }}>
                      <td>
                        <div style={{ fontWeight:500, color:'#e2e8f0', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                        <div style={{ fontSize:11, color:'var(--purple-light)', marginTop:2 }}>#{c.id.slice(0,8)}</div>
                      </td>
                      <td><StatusBadge status={c.status}/></td>
                      <td>{c.assigned_to_user_id ? <PriorityBadge priority={c.priority_level}/> : <span style={{ color:'#475569' }}>—</span>}</td>
                      <td>
                        {c.assigned_to_user_id ? (
                          c.ai_summary ? (
                            <div style={{ fontSize:12, color:'#94a3b8', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.ai_summary}</div>
                          ) : (
                            <span style={{ fontSize:12, color:'#334155' }}>Processing...</span>
                          )
                        ) : (
                          <span style={{ color:'#475569' }}>—</span>
                        )}
                      </td>
                      <td style={{ color:'#64748b', fontSize:12, whiteSpace:'nowrap' }}><ClientDate date={c.created_at} showTime={false} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="info-box">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:'rgba(59,130,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <FileText size={17} style={{ color: '#60a5fa' }}/>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#f1f5f9' }}>Review Process</div>
              </div>
            </div>
            <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>Your complaints are reviewed by authorized HR/CMD teams. Please share clear details to help resolve your issue.</p>
          </div>

          <div className="glass" style={{ padding:20 }}>
            <div className="section-title" style={{ marginBottom:16, fontSize:13 }}>Status Breakdown</div>
            {[
              { label:'Pending', val:stats.pending, color:'#f59e0b' },
              { label:'In Progress', val:stats.in_progress, color:'#3b82f6' },
              { label:'Resolved', val:stats.solved, color:'#10b981' },
            ].map(s => (
              <div key={s.label} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>{s.label}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:s.color }}>{s.val}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width:`${stats.total ? (s.val/stats.total)*100 : 0}%`, background:s.color }}/></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
