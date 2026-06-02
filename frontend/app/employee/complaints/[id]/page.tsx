'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import ClientDate from '@/components/ClientDate';
import { getComplaint, withdrawComplaint, rateComplaint, updateComplaint, deleteAttachment } from '@/lib/api';
import api from '@/lib/api';
import { ArrowLeft, Star, Clock, Brain, Edit3, X, Check, Paperclip, Trash2 } from 'lucide-react';

export default function EmployeeComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    getComplaint(id)
      .then(r => { 
        setC(r.data); 
        setEditForm({ title: r.data.title, description: r.data.description }); 
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this complaint?')) return;
    try { 
      await withdrawComplaint(id); 
      load(); 
      setMsg('Complaint withdrawn.'); 
    } catch { 
      setMsg('Failed to withdraw.'); 
    }
  };

  const handleRate = async () => {
    if (rating < 1) return;
    setRatingSubmitting(true);
    try { 
      await rateComplaint(id, { rating, feedback: feedback || undefined }); 
      load(); 
      setMsg('Rating submitted!'); 
    } catch { 
      setMsg('Failed to rate.'); 
    } finally { 
      setRatingSubmitting(false); 
    }
  };

  const handleEdit = async () => {
    setSaving(true);
    try { 
      await updateComplaint(id, editForm); 
      load(); 
      setEditing(false); 
      setMsg('Updated!'); 
    } catch { 
      setMsg('Failed to update.'); 
    } finally { 
      setSaving(false); 
    }
  };

  // Attachment download helper
  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const response = await api.get(`/complaints/attachments/${attachmentId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      setMsg('Failed to download attachment.');
    }
  };

  // Attachment delete helper
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await deleteAttachment(attachmentId);
      load();
      setMsg('Attachment removed successfully.');
    } catch {
      setMsg('Failed to delete attachment.');
    }
  };

  if (loading) return <DashboardLayout title="Loading..."><div className="empty-state"><div className="spinner"/></div></DashboardLayout>;
  if (!c) return <DashboardLayout title="Not Found"><div className="empty-state"><p>Complaint not found</p></div></DashboardLayout>;

  return (
    <DashboardLayout title="Complaint Detail">
      <button className="btn btn-secondary" onClick={() => router.back()} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14}/> Back
      </button>

      {msg && <div className="success-box" style={{ marginBottom: 16 }}>{msg}</div>}

      {/* Header card */}
      <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}/>
                <textarea className="input textarea" rows={4} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}/>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
                    {saving ? 'Saving...' : <><Check size={14}/> Save</>}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setEditing(false)}><X size={14}/> Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{c.title}</h2>
                  <span style={{ fontSize: 11, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                    #{c.id.slice(0, 8)}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 12 }}>{c.description}</p>
              </>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={c.status}/>
              <PriorityBadge priority={c.priority_level}/>
              {c.primary_department && (
                <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                  {c.primary_department}
                </span>
              )}
              {c.is_anonymous && (
                <span className="badge" style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.2)' }}>
                  Anonymous
                </span>
              )}
            </div>
          </div>
          {c.status === 'PENDING' && !editing && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => setEditing(true)}><Edit3 size={14}/> Edit</button>
              <button className="btn btn-danger" onClick={handleWithdraw}>Withdraw</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* AI Analysis */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Brain size={16} style={{ color: '#818cf8' }}/>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>AI Analysis</span>
          </div>
          {[
            { label: 'Summary', value: c.ai_summary },
            { label: 'Category Reason', value: c.ai_categorization_reason },
            { label: 'Priority Reason', value: c.ai_priority_reason },
            { label: 'Sub-category', value: c.sub_category },
          ].map(item => item.value && (
            <div key={item.label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{item.value}</div>
            </div>
          ))}
          {!c.ai_summary && <div style={{ fontSize: 13, color: '#64748b' }}>AI analysis pending...</div>}
        </div>

        {/* Timeline */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={16} style={{ color: '#60a5fa' }}/>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Timeline</span>
          </div>
          {[
            { label: 'Created', date: c.created_at, color: '#6366f1' },
            { label: 'Updated', date: c.updated_at, color: '#3b82f6' },
            { label: 'SLA Due', date: c.sla_due_at, color: c.sla_due_at && new Date(c.sla_due_at) < new Date() ? '#ef4444' : '#f59e0b' },
            { label: 'Resolved', date: c.resolved_at, color: '#10b981' },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.date ? t.color : '#1e293b', border: t.date ? 'none' : '1px solid #334155', flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{t.label}</span>
                <span style={{ fontSize: 12, color: t.date ? '#e2e8f0' : '#334155', marginLeft: 8 }}>
                  {t.date ? <ClientDate date={t.date} /> : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution detail */}
      {c.resolution_detail && (
        <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#34d399', marginBottom: 12 }}>✓ Resolution</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{c.resolution_detail.resolution_note}</p>
          {c.resolution_detail.root_cause && <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}><strong>Root Cause:</strong> {c.resolution_detail.root_cause}</p>}
        </div>
      )}

      {/* Rejection detail */}
      {c.rejection && (
        <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f87171', marginBottom: 12 }}>✗ Rejected</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{c.rejection.reason}</p>
          {c.rejection.category && <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}><strong>Category:</strong> {c.rejection.category}</p>}
        </div>
      )}

      {/* Rating section */}
      {c.status === 'SOLVED' && !c.rating && (
        <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Rate Resolution</h3>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setRating(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <Star size={28} fill={s <= rating ? '#f59e0b' : 'transparent'} color={s <= rating ? '#f59e0b' : '#334155'} strokeWidth={1.5}/>
              </button>
            ))}
          </div>
          <textarea className="input textarea" rows={2} placeholder="Optional feedback..." value={feedback} onChange={e => setFeedback(e.target.value)} style={{ marginBottom: 12 }}/>
          <button className="btn btn-primary" onClick={handleRate} disabled={rating < 1 || ratingSubmitting}>
            {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      )}

      {c.rating && (
        <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>Your Rating</h3>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {[1,2,3,4,5].map(s => <Star key={s} size={20} fill={s <= c.rating.rating ? '#f59e0b' : 'transparent'} color={s <= c.rating.rating ? '#f59e0b' : '#334155'} strokeWidth={1.5}/>)}
          </div>
          {c.rating.feedback && <p style={{ fontSize: 13, color: '#94a3b8' }}>{c.rating.feedback}</p>}
        </div>
      )}

      {/* Attachments */}
      {c.attachments?.length > 0 && (
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Paperclip size={16} style={{ color: '#64748b' }}/>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Attachments ({c.attachments.length})</span>
          </div>
          {c.attachments.map((a: any) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <Paperclip size={13} style={{ color: '#64748b' }}/>
              <span style={{ fontSize: 13, color: '#94a3b8', flex: 1 }}>{a.original_name}</span>
              <span style={{ fontSize: 11, color: '#64748b', marginRight: 10 }}>{(a.size_bytes / 1024).toFixed(1)} KB</span>
              <button className="btn btn-secondary" onClick={() => handleDownloadAttachment(a.id, a.original_name)} style={{ padding: '4px 8px', fontSize: 11 }}>Download</button>
              {c.status === 'PENDING' && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteAttachment(a.id)} 
                  style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <Trash2 size={11}/> Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
