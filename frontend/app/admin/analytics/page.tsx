'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getAnalytics } from '@/lib/api';
import { Clock, AlertTriangle, Repeat } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from '@/lib/charts';

const STATUS_COLORS: Record<string,string> = { pending:'#f59e0b', in_progress:'#3b82f6', solved:'#10b981', rejected:'#ef4444', withdrawn:'#64748b', expired:'#94a3b8' };
const PRIORITY_COLORS = ['#ef4444','#f59e0b','#3b82f6','#10b981'];
const DEPT_COLORS = ['#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#f97316','#ef4444'];

export default function AdminAnalytics() {
  const [a, setA] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then(r => setA(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout title="Analytics"><div className="empty-state"><div className="spinner"/></div></DashboardLayout>;
  if (!a) return <DashboardLayout title="Analytics"><div className="empty-state"><p>No analytics data available</p></div></DashboardLayout>;

  const statusData = [
    { name:'Pending', value:a.pending, color:'#f59e0b' },
    { name:'In Progress', value:a.in_progress, color:'#3b82f6' },
    { name:'Solved', value:a.solved, color:'#10b981' },
    { name:'Rejected', value:a.rejected, color:'#ef4444' },
    { name:'Withdrawn', value:a.withdrawn, color:'#64748b' },
    { name:'Expired', value:a.expired, color:'#94a3b8' },
  ];

  const priorityData = a.priority_breakdown ? Object.entries(a.priority_breakdown).map(([name, value]) => ({ name, value: value as number })) : [];
  const deptData = a.department_breakdown ? Object.entries(a.department_breakdown).map(([name, value]) => ({ name, value: value as number })) : [];

  return (
    <DashboardLayout title="Analytics">
      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <div className="glass" style={{ padding:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(59,130,246,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Clock size={20} style={{ color:'#60a5fa' }}/>
          </div>
          <div>
            <div style={{ fontSize:12, color:'#64748b' }}>Avg Resolution</div>
            <div style={{ fontSize:22, fontWeight:700, color:'#f1f5f9' }}>{a.avg_resolution_hours != null ? `${a.avg_resolution_hours.toFixed(1)}h` : '—'}</div>
          </div>
        </div>
        <div className="glass" style={{ padding:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <AlertTriangle size={20} style={{ color:'#f87171' }}/>
          </div>
          <div>
            <div style={{ fontSize:12, color:'#64748b' }}>SLA Breaches</div>
            <div style={{ fontSize:22, fontWeight:700, color:'#f1f5f9' }}>{a.sla_breach_count}</div>
          </div>
        </div>
        <div className="glass" style={{ padding:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(245,158,11,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Repeat size={20} style={{ color:'#fbbf24' }}/>
          </div>
          <div>
            <div style={{ fontSize:12, color:'#64748b' }}>Repeat Complaints</div>
            <div style={{ fontSize:22, fontWeight:700, color:'#f1f5f9' }}>{a.repeat_complaint_count}</div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Status breakdown */}
        <div className="glass" style={{ padding:24 }}>
          <div className="section-title" style={{ marginBottom:16 }}>Status Breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} layout="vertical" barSize={18}>
              <XAxis type="number" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} width={80}/>
              <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:12 }}/>
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {statusData.map((d,i) => <Cell key={i} fill={d.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority donut */}
        <div className="glass" style={{ padding:24 }}>
          <div className="section-title" style={{ marginBottom:16 }}>Priority Distribution</div>
          {priorityData.length > 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:24 }}>
              <PieChart width={140} height={140}>
                <Pie data={priorityData} cx={65} cy={65} innerRadius={38} outerRadius={60} dataKey="value">
                  {priorityData.map((_,i) => <Cell key={i} fill={PRIORITY_COLORS[i%PRIORITY_COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:12 }}/>
              </PieChart>
              <div>
                {priorityData.map((d,i) => (
                  <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:PRIORITY_COLORS[i%PRIORITY_COLORS.length] }}/>
                    <span style={{ fontSize:13, color:'#94a3b8', flex:1 }}>{d.name}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'#f1f5f9' }}>{d.value as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="empty-state" style={{ padding:30 }}><p>No data</p></div>}
        </div>
      </div>

      {/* Department breakdown */}
      <div className="glass" style={{ padding:24 }}>
        <div className="section-title" style={{ marginBottom:16 }}>Department Distribution</div>
        {deptData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:12 }}/>
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {deptData.map((_,i) => <Cell key={i} fill={DEPT_COLORS[i%DEPT_COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="empty-state" style={{ padding:40 }}><p>No department data</p></div>}
      </div>
    </DashboardLayout>
  );
}
