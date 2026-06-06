'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { StatusBadge, PriorityBadge, HRBadge } from '@/components/Badges';
import ClientDate from '@/components/ClientDate';
import {
  getComplaint, startComplaint, assignComplaint, resolveComplaint, rejectComplaint,
  reopenComplaint, getNotes, addNote, getComplaintAuditLogs, uploadAttachment, getUsers,
  overrideComplaint
} from '@/lib/api';
import {
  ArrowLeft, Play, CheckCircle, XCircle, UserPlus, RotateCcw, Brain,
  Clock, Paperclip, Upload, Send, X, Eye, EyeOff
} from 'lucide-react';

export default function HandlerComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'notes'|'audit'>('notes');
  const [modal, setModal] = useState<''|'assign'|'resolve'|'reject'|'override'>('');
  const [msg, setMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Forms
  const [assignUser, setAssignUser] = useState('');
  const [resolveForm, setResolveForm] = useState({ resolution_note:'', root_cause:'', visible_to_employee:true });
  const [rejectForm, setRejectForm] = useState({ reason:'', category:'' });
  const [noteForm, setNoteForm] = useState({ content:'', is_visible_to_employee:false });
  const [overrideForm, setOverrideForm] = useState({ primary_department: '', sub_category: '', priority_level: '', is_hr_sensitive: false });

  useEffect(() => {
    if (c) {
      setOverrideForm({
        primary_department: c.primary_department || '',
        sub_category: c.sub_category || '',
        priority_level: c.priority_level || '',
        is_hr_sensitive: c.is_hr_sensitive || false
      });
    }
  }, [c, modal]);

  const load = () => {
    setLoading(true);
    Promise.all([
      getComplaint(id),
      getNotes(id).catch(() => ({ data: [] })),
      getComplaintAuditLogs(id).catch(() => ({ data: [] })),
      getUsers().catch(() => ({ data: [] })),
    ]).then(([cr, nr, ar, ur]) => {
      setC(cr.data); setNotes(nr.data); setAuditLogs(ar.data); setUsers(ur.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const doAction = async (fn: () => Promise<any>, success: string) => {
    setActionLoading(true); setMsg('');
    try { await fn(); load(); setModal(''); setMsg(success); } catch (e: any) { setMsg(e.response?.data?.detail || 'Action failed.'); }
    finally { setActionLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await uploadAttachment(id, file); load(); setMsg('File uploaded!'); } catch { setMsg('Upload failed.'); }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.content.trim()) return;
    try { await addNote(id, { content: noteForm.content, is_visible_to_employee: noteForm.is_visible_to_employee }); setNoteForm({ content:'', is_visible_to_employee:false }); load(); }
    catch { setMsg('Failed to add note.'); }
  };

  if (loading) return <DashboardLayout title="Loading..."><div className="empty-state"><div className="spinner"/></div></DashboardLayout>;
  if (!c) return <DashboardLayout title="Not Found"><div className="empty-state"><p>Complaint not found</p></div></DashboardLayout>;

  const isPending = c.status === 'PENDING';
  const isInProgress = c.status === 'IN_PROGRESS';
  const isClosed = ['SOLVED','REJECTED','WITHDRAWN','EXPIRED'].includes(c.status);

  return (
    <DashboardLayout title="Complaint Detail">
      <button className="btn btn-secondary" onClick={() => router.back()} style={{ marginBottom:16 }}><ArrowLeft size={14}/> Back</button>
      {msg && <div className={msg.includes('fail') || msg.includes('Failed') ? 'error-box' : 'success-box'} style={{ marginBottom:14 }}>{msg}</div>}

      {/* Header */}
      <div className="glass" style={{ padding:24, marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
              <h2 style={{ fontSize:18, fontWeight:700, color:'#f1f5f9' }}>{c.title}</h2>
              <span style={{ fontSize:11, color:'var(--purple-light)', background:'rgba(16,185,129,0.1)', padding:'2px 8px', borderRadius:6 }}>#{c.id.slice(0,8)}</span>
            </div>
            <p style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7, marginBottom:14 }}>{c.description}</p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <StatusBadge status={c.status}/><PriorityBadge priority={c.priority_level}/><HRBadge sensitive={c.is_hr_sensitive}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            {isPending && <button className="btn btn-primary" onClick={() => doAction(() => startComplaint(id), 'Work started!')}><Play size={14}/> Start</button>}
            {isPending && <button className="btn btn-secondary" onClick={() => setModal('assign')}><UserPlus size={14}/> Assign</button>}
            {(isPending || isInProgress) && <button className="btn btn-success" onClick={() => setModal('resolve')}><CheckCircle size={14}/> Resolve</button>}
            {(isPending || isInProgress) && <button className="btn btn-danger" onClick={() => setModal('reject')}><XCircle size={14}/> Reject</button>}
            {isClosed && <button className="btn btn-secondary" onClick={() => doAction(() => reopenComplaint(id), 'Reopened!')}><RotateCcw size={14}/> Reopen</button>}
            {isInProgress && <button className="btn btn-secondary" onClick={() => setModal('assign')}><UserPlus size={14}/> Reassign</button>}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <div className="glass" style={{ padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}><Brain size={16} style={{ color:'#34d399' }}/><span style={{ fontSize:14, fontWeight:600, color:'#f1f5f9' }}>AI Analysis</span></div>
            <button className="btn btn-secondary" style={{ fontSize:11, padding:'4px 8px' }} onClick={() => setModal('override')}>Override</button>
          </div>
          {[{l:'Summary',v:c.ai_summary},{l:'Category Reason',v:c.ai_categorization_reason},{l:'Priority Reason',v:c.ai_priority_reason},{l:'Sub-category',v:c.sub_category},{l:'Department',v:c.primary_department}].map(i => i.v && (
            <div key={i.l} style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{i.l}</div>
              <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.5 }}>{i.v}</div>
            </div>
          ))}
          {!c.ai_summary && <div style={{ color:'#475569', fontSize:13 }}>AI analysis pending...</div>}
        </div>
        <div className="glass" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}><Clock size={16} style={{ color:'#60a5fa' }}/><span style={{ fontSize:14, fontWeight:600, color:'#f1f5f9' }}>Details</span></div>
          {[
            {l:'Employee ID',v:c.employee_id?.slice(0,8)},{l:'Assigned To',v:c.assigned_to_user_id?.slice(0,8)||'Unassigned'},
            {l:'Escalation',v:`Level ${c.escalation_level}`},{l:'Priority Score',v:c.priority_score?.toFixed(2)},
            {l:'Created',v:<ClientDate date={c.created_at} />},{l:'SLA Due',v:c.sla_due_at ? <ClientDate date={c.sla_due_at} /> : '—'},
            {l:'Resolved',v:c.resolved_at ? <ClientDate date={c.resolved_at} /> : '—'},
          ].map(i => (
            <div key={i.l} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:12, color:'#475569' }}>{i.l}</span>
              <span style={{ fontSize:12, color:'#e2e8f0', fontWeight:500 }}>{i.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution / Rejection */}
      {c.resolution_detail && (
        <div className="glass" style={{ padding:20, marginBottom:20, borderColor:'rgba(16,185,129,0.2)' }}>
          <h3 style={{ fontSize:14, fontWeight:600, color:'#34d399', marginBottom:10 }}>✓ Resolution</h3>
          <p style={{ fontSize:13, color:'#94a3b8', lineHeight:1.6 }}>{c.resolution_detail.resolution_note}</p>
          {c.resolution_detail.root_cause && <p style={{ fontSize:13, color:'#64748b', marginTop:6 }}><strong>Root Cause:</strong> {c.resolution_detail.root_cause}</p>}
        </div>
      )}
      {c.rejection && (
        <div className="glass" style={{ padding:20, marginBottom:20, borderColor:'rgba(239,68,68,0.2)' }}>
          <h3 style={{ fontSize:14, fontWeight:600, color:'#f87171', marginBottom:10 }}>✗ Rejected</h3>
          <p style={{ fontSize:13, color:'#94a3b8' }}>{c.rejection.reason}</p>
        </div>
      )}

      {/* Attachments */}
      <div className="glass" style={{ padding:20, marginBottom:20 }}>
        <div className="section-header" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><Paperclip size={16} style={{ color:'#64748b' }}/><span style={{ fontSize:14, fontWeight:600, color:'#f1f5f9' }}>Attachments ({c.attachments?.length || 0})</span></div>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ fontSize:12 }}><Upload size={13}/> Upload</button>
          <input ref={fileRef} type="file" hidden onChange={handleUpload}/>
        </div>
        {c.attachments?.map((a:any) => (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
            <Paperclip size={12} style={{ color:'#475569' }}/><span style={{ fontSize:13, color:'#94a3b8', flex:1 }}>{a.original_name}</span>
            <span style={{ fontSize:11, color:'#475569' }}>{(a.size_bytes/1024).toFixed(1)} KB</span>
          </div>
        ))}
      </div>

      {/* Tabs: Notes / Audit */}
      <div className="tab-bar" style={{ marginBottom:16, maxWidth:280 }}>
        <button className={`tab-btn ${activeTab==='notes'?'active':''}`} onClick={() => setActiveTab('notes')}>Internal Notes ({notes.length})</button>
        <button className={`tab-btn ${activeTab==='audit'?'active':''}`} onClick={() => setActiveTab('audit')}>Audit Log ({auditLogs.length})</button>
      </div>

      {activeTab === 'notes' && (
        <div className="glass" style={{ padding:20 }}>
          <form onSubmit={handleAddNote} style={{ display:'flex', gap:10, marginBottom:16, alignItems:'flex-end' }}>
            <div style={{ flex:1 }}>
              <textarea className="input textarea" rows={2} placeholder="Add internal note..." value={noteForm.content} onChange={e => setNoteForm(f=>({...f,content:e.target.value}))}/>
              <label className="checkbox-label" style={{ marginTop:6 }}>
                <input type="checkbox" checked={noteForm.is_visible_to_employee} onChange={e => setNoteForm(f=>({...f,is_visible_to_employee:e.target.checked}))}/>
                {noteForm.is_visible_to_employee ? <Eye size={12}/> : <EyeOff size={12}/>} Visible to employee
              </label>
            </div>
            <button type="submit" className="btn btn-primary" style={{ flexShrink:0, height:40 }}><Send size={14}/></button>
          </form>
          {notes.length === 0 ? <div style={{ fontSize:13, color:'#475569', textAlign:'center', padding:20 }}>No notes yet</div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {notes.map((n:any) => (
                <div key={n.id} style={{ padding:'10px 14px', background:'rgba(255,255,255,0.02)', borderRadius:10, border:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f0' }}>{n.role_at_time} · {n.author_user_id?.slice(0,8)}</span>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      {n.is_visible_to_employee ? <Eye size={11} style={{ color:'#34d399' }}/> : <EyeOff size={11} style={{ color:'#475569' }}/>}
                      <span style={{ fontSize:11, color:'#475569' }}><ClientDate date={n.created_at} /></span>
                    </div>
                  </div>
                  <p style={{ fontSize:13, color:'#94a3b8', lineHeight:1.5 }}>{n.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="glass" style={{ padding:20 }}>
          {auditLogs.length === 0 ? <div style={{ fontSize:13, color:'#475569', textAlign:'center', padding:20 }}>No audit logs</div> : (
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Changes</th></tr></thead>
                <tbody>
                  {auditLogs.map((l:any) => (
                    <tr key={l.id}>
                      <td style={{ fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}><ClientDate date={l.created_at} /></td>
                      <td><span className="badge" style={{ background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }}>{l.action_type}</span></td>
                      <td style={{ fontSize:12, color:'#94a3b8' }}>{l.actor_user_id?.slice(0,8) || 'System'}</td>
                      <td style={{ fontSize:12, color:'#64748b', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.new_value_json ? JSON.stringify(l.new_value_json).slice(0,60) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {modal === 'assign' && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(''); }}>
          <div className="modal-box animate-fade-in">
            <div className="section-header" style={{ marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:600, color:'#f1f5f9' }}>Assign Complaint</h3>
              <button className="btn-icon" onClick={() => setModal('')}><X size={16}/></button>
            </div>
            <select className="select" value={assignUser} onChange={e => setAssignUser(e.target.value)} style={{ marginBottom:16, width:'100%' }}>
              <option value="">Select user...</option>
              {users.filter((u:any) => u.role !== 'EMPLOYEE').map((u:any) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role}) — {u.department||'No dept'}</option>
              ))}
            </select>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setModal('')}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} disabled={!assignUser || actionLoading}
                onClick={() => doAction(() => assignComplaint(id, { assigned_to_user_id: assignUser }), 'Assigned!')}>
                {actionLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'resolve' && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(''); }}>
          <div className="modal-box animate-fade-in">
            <div className="section-header" style={{ marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:600, color:'#f1f5f9' }}>Resolve Complaint</h3>
              <button className="btn-icon" onClick={() => setModal('')}><X size={16}/></button>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Resolution Note *</label>
              <textarea className="input textarea" rows={4} value={resolveForm.resolution_note} onChange={e => setResolveForm(f=>({...f,resolution_note:e.target.value}))} required/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Root Cause (optional)</label>
              <textarea className="input textarea" rows={2} value={resolveForm.root_cause} onChange={e => setResolveForm(f=>({...f,root_cause:e.target.value}))}/>
            </div>
            <label className="checkbox-label" style={{ marginBottom:16 }}>
              <input type="checkbox" checked={resolveForm.visible_to_employee} onChange={e => setResolveForm(f=>({...f,visible_to_employee:e.target.checked}))}/>
              Visible to employee
            </label>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setModal('')}>Cancel</button>
              <button className="btn btn-success" style={{ flex:1 }} disabled={!resolveForm.resolution_note || actionLoading}
                onClick={() => doAction(() => resolveComplaint(id, { resolution_note: resolveForm.resolution_note, root_cause: resolveForm.root_cause || undefined, visible_to_employee: resolveForm.visible_to_employee }), 'Resolved!')}>
                {actionLoading ? 'Resolving...' : <><CheckCircle size={14}/> Resolve</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'reject' && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(''); }}>
          <div className="modal-box animate-fade-in">
            <div className="section-header" style={{ marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:600, color:'#f1f5f9' }}>Reject Complaint</h3>
              <button className="btn-icon" onClick={() => setModal('')}><X size={16}/></button>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Reason *</label>
              <textarea className="input textarea" rows={3} value={rejectForm.reason} onChange={e => setRejectForm(f=>({...f,reason:e.target.value}))} required/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Category (optional)</label>
              <input className="input" value={rejectForm.category} onChange={e => setRejectForm(f=>({...f,category:e.target.value}))}/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setModal('')}>Cancel</button>
              <button className="btn btn-danger" style={{ flex:1 }} disabled={!rejectForm.reason || actionLoading}
                onClick={() => doAction(() => rejectComplaint(id, { reason: rejectForm.reason, category: rejectForm.category || undefined }), 'Rejected.')}>
                {actionLoading ? 'Rejecting...' : <><XCircle size={14}/> Reject</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {modal === 'override' && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(''); }}>
          <div className="modal-box animate-fade-in">
            <div className="section-header" style={{ marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:600, color:'#f1f5f9' }}>Override AI Classifications</h3>
              <button className="btn-icon" onClick={() => setModal('')}><X size={16}/></button>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Primary Department</label>
              <input className="input" value={overrideForm.primary_department} onChange={e => setOverrideForm(f=>({...f,primary_department:e.target.value}))}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Sub-category</label>
              <input className="input" value={overrideForm.sub_category} onChange={e => setOverrideForm(f=>({...f,sub_category:e.target.value}))}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Priority Level</label>
              <select className="select" value={overrideForm.priority_level} onChange={e => setOverrideForm(f=>({...f,priority_level:e.target.value}))} style={{ width:'100%' }}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <label className="checkbox-label" style={{ marginBottom:16 }}>
              <input type="checkbox" checked={overrideForm.is_hr_sensitive} onChange={e => setOverrideForm(f=>({...f,is_hr_sensitive:e.target.checked}))}/>
              HR Sensitive / Whistleblower Case
            </label>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setModal('')}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} disabled={actionLoading}
                onClick={() => doAction(() => overrideComplaint(id, overrideForm), 'Classifications updated!')}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

