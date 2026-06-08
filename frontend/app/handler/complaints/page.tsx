'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { PriorityBadge, StatusBadge, HRBadge } from '@/components/Badges';
import { getAllComplaints, startComplaint, getProfile } from '@/lib/api';
import { Eye, Play, RefreshCw, FileText } from 'lucide-react';

export default function HandlerComplaints() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  useEffect(() => {
    getProfile().then(r => {
      setProfile(r.data);
      if (r.data.can_evaluate) setActiveTab('EVALUATOR');
      else if (r.data.can_investigate) setActiveTab('INVESTIGATOR');
      else if (r.data.can_approve_resolution) setActiveTab('REVIEWER');
    }).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    let statusFilter = filterStatus;
    if (activeTab === 'EVALUATOR') statusFilter = 'PENDING';
    if (activeTab === 'INVESTIGATOR') statusFilter = 'IN_PROGRESS';
    if (activeTab === 'REVIEWER') statusFilter = 'RESOLUTION_PROPOSED';
    
    getAllComplaints({ status: statusFilter || undefined, priority: filterPriority || undefined, page_size: 100 })
      .then(r => setComplaints(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [filterStatus, filterPriority, activeTab]);

  return (
    <DashboardLayout title="Complaints">
      <div className="glass" style={{ padding:24 }}>
        
        {/* Capability Tabs */}
        {profile && (profile.can_evaluate || profile.can_investigate || profile.can_approve_resolution) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10 }}>
            {profile.can_evaluate && (
              <button 
                className={`btn ${activeTab === 'EVALUATOR' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setActiveTab('EVALUATOR'); setFilterStatus(''); }}
              >
                Evaluator (Pending)
              </button>
            )}
            {profile.can_investigate && (
              <button 
                className={`btn ${activeTab === 'INVESTIGATOR' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setActiveTab('INVESTIGATOR'); setFilterStatus(''); }}
              >
                Investigator (In Progress)
              </button>
            )}
            {profile.can_approve_resolution && (
              <button 
                className={`btn ${activeTab === 'REVIEWER' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => { setActiveTab('REVIEWER'); setFilterStatus(''); }}
              >
                Reviewer (Resolutions)
              </button>
            )}
            <button 
              className={`btn ${activeTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setActiveTab('ALL')}
            >
              All Complaints
            </button>
          </div>
        )}

        <div className="section-header">
          <div>
            <div className="section-title">
              {activeTab === 'EVALUATOR' && 'Complaints Awaiting Triage'}
              {activeTab === 'INVESTIGATOR' && 'Active Investigations'}
              {activeTab === 'REVIEWER' && 'Resolutions Awaiting Review'}
              {activeTab === 'ALL' && `All Complaints (${complaints.length})`}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {activeTab === 'ALL' && (
              <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize:12, height:36, width:130 }}>
                <option value="">All Status</option><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLUTION_PROPOSED">Resolution Proposed</option><option value="SOLVED">Solved</option><option value="REJECTED">Rejected</option>
              </select>
            )}
            <select className="select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ fontSize:12, height:36, width:130 }}>
              <option value="">All Priority</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
            </select>
            <button className="btn-icon" onClick={load}><RefreshCw size={14}/></button>
          </div>
        </div>
        {loading ? <div className="empty-state"><div className="spinner"/></div> : complaints.length === 0 ? (
          <div className="empty-state"><FileText size={40}/><p>No complaints found</p></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>ID / Title</th><th>Dept</th><th>Priority</th><th>Status</th><th>HR</th><th>SLA</th><th>Actions</th></tr></thead>
              <tbody>
                {complaints.map(c => {
                  const sla = c.sla_due_at ? new Date(c.sla_due_at) : null;
                  const hrs = sla ? Math.round((sla.getTime()-Date.now())/3600000) : null;
                  return (
                    <tr key={c.id}>
                      <td><div style={{ fontWeight:500, color:'#e2e8f0' }}>{c.title}</div><div style={{ fontSize:11, color:'var(--purple-light)' }}>#{c.id.slice(0,8)}</div></td>
                      <td style={{ fontSize:13, color:'#94a3b8' }}>{c.primary_department||'—'}</td>
                      <td><PriorityBadge priority={c.priority_level}/></td>
                      <td><StatusBadge status={c.status}/></td>
                      <td><HRBadge sensitive={c.is_hr_sensitive}/></td>
                      <td style={{ fontSize:12, fontWeight:600, color: hrs!==null && hrs<0 ? '#f87171' : hrs!==null && hrs<4 ? '#fbbf24' : '#34d399' }}>
                        {hrs!==null ? (hrs<0 ? 'Overdue' : `${hrs}h`) : '—'}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:5 }}>
                          <button className="btn-icon" onClick={() => router.push(`/handler/complaints/${c.id}`)}><Eye size={13}/></button>
                          {!(profile?.role === 'CMD' && c.is_hr_sensitive) && c.status === 'PENDING' && <button className="btn-icon" onClick={() => startComplaint(c.id).then(load)} title="Start"><Play size={13}/></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
