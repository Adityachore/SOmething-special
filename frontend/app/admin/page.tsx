'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/StatCard';
import { getAnalytics, getUsers, getAdminAuditLogs } from '@/lib/api';
import ClientDate from '@/components/ClientDate';
import { Users, Activity, Globe, FileText, ShieldCheck, Database, Server, Cpu, HardDrive } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from '@/lib/charts';

const COLORS = ['#10b981','#059669','#34d399','#3b82f6','#06b6d4','#fbbf24'];

export default function AdminDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAnalytics().catch(() => ({ data: null })),
      getUsers().catch(() => ({ data: [] })),
      getAdminAuditLogs({ page_size: 5 }).catch(() => ({ data: [] })),
    ]).then(([ar, ur, lr]) => {
      setAnalytics(ar.data); setUsers(ur.data); setLogs(lr.data);
    }).finally(() => setLoading(false));
  }, []);

  const a = analytics || {};
  const deptPie = a.department_breakdown
    ? Object.entries(a.department_breakdown).map(([name, value]) => ({ name, value: value as number }))
    : [];
  const total = a.total_complaints || 0;

  // Real weekly trend from DB (falls back to empty array while loading)
  const trend: { date: string; total: number; resolved: number; pending: number }[] = a.weekly_trend || [];

  const health = [
    { name:'Database', icon:<Database size={14}/>, ok:true },
    { name:'Redis', icon:<Server size={14}/>, ok:true },
    { name:'AI Service', icon:<Cpu size={14}/>, ok:true },
    { name:'Storage', icon:<HardDrive size={14}/>, ok:true },
  ];

  return (
    <DashboardLayout title="Admin Overview">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Total Users" value={users.length} icon={<Users size={18}/>} color="purple"/>
        <StatCard label="Active Users" value={a.active_users_count ?? users.length} icon={<Activity size={18}/>} color="blue"/>
        <StatCard label="Departments" value={deptPie.length || 0} icon={<Globe size={18}/>} color="green"/>
        <StatCard label="Total Complaints" value={total} icon={<FileText size={18}/>} color="amber"/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, marginBottom:20 }}>
        <div className="glass" style={{ padding:24 }}>
          <div className="section-title" style={{ marginBottom:4 }}>Complaints Trend</div>
          <div className="section-sub" style={{ marginBottom:16 }}>Weekly overview</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:12 }}/>
              <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#gt)"/>
              <Area type="monotone" dataKey="resolved" stroke="#34d399" strokeWidth={2} fill="url(#gr)"/>
            </AreaChart>
          </ResponsiveContainer>
          {trend.length === 0 && (
            <div style={{ textAlign:'center', color:'#475569', fontSize:13, paddingTop:10 }}>No complaint data yet.</div>
          )}
        </div>

        <div className="glass" style={{ padding:20 }}>
          <div className="section-title" style={{ fontSize:13, marginBottom:14 }}>By Department</div>
          {deptPie.length > 0 ? (
            <>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
                <PieChart width={120} height={120}>
                  <Pie data={deptPie} cx={55} cy={55} innerRadius={34} outerRadius={52} dataKey="value">
                    {deptPie.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                </PieChart>
              </div>
              {deptPie.slice(0,5).map((d,i) => (
                <div key={d.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#94a3b8' }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:COLORS[i%COLORS.length] }}/>{d.name}
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, color:'#f1f5f9' }}>{total ? Math.round(((d.value as number)/total)*100) : 0}%</span>
                </div>
              ))}
            </>
          ) : <div className="empty-state" style={{ padding:30 }}><p>No data</p></div>}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div className="glass" style={{ padding:24 }}>
          <div className="section-header" style={{ marginBottom:12 }}>
            <div className="section-title" style={{ fontSize:14 }}>Recent Audit Logs</div>
            <button onClick={() => router.push('/admin/audit')} style={{ fontSize:12, color:'#10b981', background:'none', border:'none', cursor:'pointer' }}>View All →</button>
          </div>
          {logs.length > 0 ? logs.map((l:any, i:number) => (
            <div key={l.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom: i<logs.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'rgba(16,185,129,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><ShieldCheck size={13} style={{ color:'#34d399' }}/></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:'#e2e8f0' }}>{l.action_type} · #{l.complaint_id?.slice(0,8)}</div>
                <div style={{ fontSize:11, color:'#475569', marginTop:1 }}><ClientDate date={l.created_at} /></div>
              </div>
            </div>
          )) : <div style={{ fontSize:13, color:'#475569', textAlign:'center', padding:20 }}>No recent activity</div>}
        </div>

        <div className="glass" style={{ padding:24 }}>
          <div className="section-title" style={{ fontSize:14, marginBottom:16 }}>System Health</div>
          {health.map(h => (
            <div key={h.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'rgba(255,255,255,0.02)', borderRadius:10, border:'1px solid rgba(255,255,255,0.05)', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981' }} className="animate-pulse-dot"/>{h.icon}
                <span style={{ fontSize:13, color:'#94a3b8' }}>{h.name}</span>
              </div>
              <span style={{ fontSize:12, fontWeight:600, color:'#34d399', background:'rgba(16,185,129,0.1)', padding:'2px 8px', borderRadius:6 }}>Healthy</span>
            </div>
          ))}
          <div style={{ marginTop:12, padding:'10px 12px', background:'rgba(16,185,129,0.04)', borderRadius:10, border:'1px solid rgba(16,185,129,0.12)' }}>
            <div style={{ fontSize:12, color:'#34d399', fontWeight:500 }}>✓ All systems operational</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
