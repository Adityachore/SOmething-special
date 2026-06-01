'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { createComplaint } from '@/lib/api';
import { Brain, CheckCircle, PlusCircle } from 'lucide-react';

export default function SubmitComplaint() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.description.trim().length < 20) { setError('Description must be at least 20 characters.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await createComplaint(form);
      setSuccess(res.data);
      setForm({ title: '', description: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit complaint.');
    } finally { setSubmitting(false); }
  };

  return (
    <DashboardLayout title="Submit Complaint">
      {success ? (
        <div className="glass animate-fade-in" style={{ padding:32, maxWidth:560 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <CheckCircle size={28} style={{ color:'#34d399' }}/>
            </div>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', marginBottom:6 }}>Complaint Submitted!</h2>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>AI is analyzing your complaint. You'll be notified when processing is complete.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn btn-primary" onClick={() => router.push(`/employee/complaints/${success.id}`)}>View Complaint</button>
              <button className="btn btn-secondary" onClick={() => setSuccess(null)}><PlusCircle size={14}/> Submit Another</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass animate-fade-in" style={{ padding:28, maxWidth:560 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#8b5cf6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Brain size={18} color="white"/>
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:600, color:'#f1f5f9' }}>New Complaint</div>
              <div style={{ fontSize:12, color:'#64748b' }}>AI will categorize and route automatically</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#94a3b8', marginBottom:6 }}>Complaint Title *</label>
              <input className="input" placeholder="Brief, descriptive title" value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} required/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#94a3b8', marginBottom:6 }}>
                Description * <span style={{ color:'#475569', fontWeight:400 }}>(min 20 characters)</span>
              </label>
              <textarea className="input textarea" rows={6} placeholder="Describe your complaint in detail..." value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} required/>
              <div style={{ fontSize:11, color: form.description.length >= 20 ? '#34d399' : '#475569', marginTop:4 }}>
                {form.description.length}/20 characters
              </div>
            </div>
            {error && <div className="error-box" style={{ marginBottom:14 }}>{error}</div>}
            <button type="submit" className="btn btn-primary" style={{ width:'100%' }} disabled={submitting}>
              {submitting ? <div className="spinner spinner-sm"/> : <><Brain size={15}/> Submit Complaint</>}
            </button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
