'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/StatCard';
import { PriorityBadge, StatusBadge, HRBadge } from '@/components/Badges';
import { getAllComplaints, startComplaint } from '@/lib/api';
import { FileText, Clock, CheckCircle, AlertTriangle, AlertOctagon, Eye, Play, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from '@/lib/charts';

const COLORS = ['#10b981','#059669','#34d399','#3b82f6','#06b6d4','#f59e0b'];

export default function HandlerDashboard() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const load = () => {
    setLoading(true);
    getAllComplaints({ status: filterStatus || undefined, priority: filterPriority || undefined, page_size: 50 })
      .then(r => setComplaints(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [filterStatus, filterPriority]);

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'PENDING').length,
    in_progress: complaints.filter(c => c.status === 'IN_PROGRESS').length,
    solved: complaints.filter(c => c.status === 'SOLVED').length,
    critical: complaints.filter(c => c.priority_level === 'CRITICAL').length,
  };

  // Dept chart
  const deptMap: Record<string, number> = {};
  complaints.forEach(c => { const d = c.primary_department || 'Unassigned'; deptMap[d] = (deptMap[d]||0)+1; });
  const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

  // SLA
  const slaOk = complaints.filter(c => !c.sla_due_at || new Date(c.sla_due_at) > new Date()).length;
  const slaPct = stats.total ? Math.round((slaOk / stats.total) * 100) : 100;

  return (
    <DashboardLayout title="Handler Dashboard">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Total" value={stats.total} icon={<FileText size={18}/>} color="purple"/>
        <StatCard label="Pending" value={stats.pending} icon={<Clock size={18}/>} color="amber"/>
        <StatCard label="In Progress" value={stats.in_progress} icon={<AlertTriangle size={18}/>} color="blue"/>
        <StatCard label="Resolved" value={stats.solved} icon={<CheckCircle size={18}/>} color="green"/>
        <StatCard label="Critical" value={stats.critical} icon={<AlertOctagon size={18}/>} color="red"/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, marginBottom:20 }}>
        <div className="glass" style={{ padding:24 }}>
          <div className="section-title" style={{ marginBottom:16 }}>Complaints by Department</div>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={deptData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:12 }}/>
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {deptData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding:40 }}><p>No data yet</p></div>}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="glass" style={{ padding:20 }}>
            <div className="section-title" style={{ fontSize:13, marginBottom:14 }}>SLA Compliance</div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ position:'relative', width:70, height:70, flexShrink:0 }}>
                <PieChart width={70} height={70}>
                  <Pie data={[{v:slaPct},{v:100-slaPct}]} cx={30} cy={30} innerRadius={22} outerRadius={32} startAngle={90} endAngle={-270} dataKey="v">
                    <Cell fill="#10b981"/><Cell fill="rgba(255,255,255,0.05)"/>
                  </Pie>
                </PieChart>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#34d399' }}>{slaPct}%</div>
              </div>
              <div>
                {[{l:'On Track',c:'#10b981',v:slaPct},{l:'At Risk',c:'#f59e0b',v:Math.max(0,100-slaPct-5)},{l:'Overdue',c:'#ef4444',v:Math.min(100-slaPct,100)}].map(s => (
                  <div key={s.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#94a3b8' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:s.c }}/>{s.l}
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:s.c }}>{s.v}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="glass" style={{ padding:20 }}>
            <div className="section-title" style={{ fontSize:13, marginBottom:12 }}>Quick Stats</div>
            {[{l:'Avg Priority',v:complaints.length ? (complaints.reduce((a,c)=>a+c.priority_score,0)/complaints.length).toFixed(1) : '—',c:'#f59e0b'},{l:'HR Sensitive',v:complaints.filter(c=>c.is_hr_sensitive).length,c:'#ef4444'},{l:'Escalated',v:complaints.filter(c=>c.escalation_level>0).length,c:'#f97316'}].map(s => (
              <div key={s.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:12, color:'#94a3b8' }}>{s.l}</span>
                <span style={{ fontSize:14, fontWeight:700, color:s.c }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass" style={{ padding:24 }}>
        <div className="section-header">
          <div className="section-title">All Complaints</div>
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
        {loading ? <div className="empty-state"><div className="spinner"/></div> : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>ID / Title</th><th>Dept</th><th>Priority</th><th>Status</th><th>HR</th><th>SLA</th><th>Actions</th></tr></thead>
              <tbody>
                {complaints.map(c => {
                  const sla = c.sla_due_at ? new Date(c.sla_due_at) : null;
                  const hrs = sla ? Math.round((sla.getTime()-Date.now())/3600000) : null;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight:500, color:'#e2e8f0', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                        <div style={{ fontSize:11, color:'var(--purple-light)', marginTop:1 }}>#{c.id.slice(0,8)}</div>
                      </td>
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
                          {c.status === 'PENDING' && <button className="btn-icon" onClick={() => { startComplaint(c.id).then(load); }} title="Start"><Play size={13}/></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {complaints.length === 0 && <div className="empty-state"><p>No complaints found</p></div>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
