'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/StatCard';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import ClientDate from '@/components/ClientDate';
import { getMyComplaints, createComplaint } from '@/lib/api';
import { FileText, Clock, CheckCircle, AlertTriangle, Plus, X, Brain } from 'lucide-react';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getMyComplaints({ page_size: 50 })
      .then(r => setComplaints(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'PENDING').length,
    in_progress: complaints.filter(c => c.status === 'IN_PROGRESS').length,
    solved: complaints.filter(c => c.status === 'SOLVED').length,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.description.trim().length < 20) { setError('Description must be at least 20 characters.'); return; }
    setSubmitting(true); setError('');
    try {
      await createComplaint(form);
      load();
      setShowModal(false);
      setForm({ title: '', description: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to submit.');
    } finally { setSubmitting(false); }
  };

  return (
    <DashboardLayout title="My Dashboard">
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
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15}/> New Complaint</button>
          </div>
          {loading ? (
            <div className="empty-state"><div className="spinner"/></div>
          ) : complaints.length === 0 ? (
            <div className="empty-state">
              <FileText size={40}/>
              <p>No complaints yet</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop:8 }}>Submit your first complaint</button>
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
                        {c.ai_summary
                          ? <div style={{ fontSize:12, color:'#94a3b8', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.ai_summary}</div>
                          : <span style={{ fontSize:12, color:'#334155' }}>Processing...</span>}
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
              <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,var(--purple),var(--purple-light))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Brain size={17} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#f1f5f9' }}>AI Processing</div>
                <div className="ai-badge" style={{ marginTop:3 }}>Gemini 1.5 Flash</div>
              </div>
            </div>
            <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>Complaints are auto-categorized, prioritized, and summarized by AI.</p>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
              {['Auto-categorization','Priority scoring','Smart routing','SLA tracking'].map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#94a3b8' }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--purple)', flexShrink:0 }}/>
                  {f}
                </div>
              ))}
            </div>
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

      {/* Submit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box animate-fade-in">
            <div className="section-header" style={{ marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700, color:'#f1f5f9' }}>Submit Complaint</h2>
                <p className="section-sub">AI will analyze and route automatically</p>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#94a3b8', marginBottom:6 }}>Title</label>
                <input className="input" placeholder="Brief title" value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} required/>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#94a3b8', marginBottom:6 }}>Description <span style={{ color:'#475569' }}>(min 20 chars)</span></label>
                <textarea className="input textarea" rows={5} placeholder="Describe your complaint in detail..." value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} required/>
              </div>
              {error && <div className="error-box" style={{ marginBottom:14 }}>{error}</div>}
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex:1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex:2 }} disabled={submitting}>
                  {submitting ? <div className="spinner spinner-sm"/> : <><Brain size={15}/> Submit</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
