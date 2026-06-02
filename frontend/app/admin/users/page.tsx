'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getUsers, createUser, updateUser } from '@/lib/api';
import ClientDate from '@/components/ClientDate';
import { Plus, Edit3, X, UserPlus } from 'lucide-react';

const ROLE_COLORS: Record<string,string> = { ADMIN:'#f59e0b', CMD:'#3b82f6', HR:'#06b6d4', EMPLOYEE:'#10b981' };

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<''|'create'|'edit'>('');
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'EMPLOYEE', department:'' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getUsers().then(r => setUsers(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm({ name:'', email:'', password:'', role:'EMPLOYEE', department:'' }); setError(''); setModal('create'); };
  const openEdit = (u: any) => { setEditUser(u); setForm({ name:u.name, email:u.email, password:'', role:u.role, department:u.department||'' }); setError(''); setModal('edit'); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try { await createUser({ name:form.name, email:form.email, password:form.password, role:form.role, department:form.department||undefined }); load(); setModal(''); }
    catch (err: any) { setError(err.response?.data?.detail || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try { await updateUser(editUser.id, { name:form.name, role:form.role, department:form.department||undefined }); load(); setModal(''); }
    catch (err: any) { setError(err.response?.data?.detail || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  return (
    <DashboardLayout title="User Management">
      <div className="glass" style={{ padding:24 }}>
        <div className="section-header">
          <div className="section-title">Users ({users.length})</div>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14}/> Add User</button>
        </div>
        {loading ? <div className="empty-state"><div className="spinner"/></div> : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>User</th><th>Role</th><th>Department</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((u:any) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,var(--purple),var(--purple-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>{u.name?.[0]||'U'}</div>
                        <div><div style={{ fontSize:13, fontWeight:500, color:'#e2e8f0' }}>{u.name}</div><div style={{ fontSize:11, color:'#475569' }}>{u.email}</div></div>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background:`${ROLE_COLORS[u.role]||'#64748b'}18`, color:ROLE_COLORS[u.role]||'#64748b', border:`1px solid ${ROLE_COLORS[u.role]||'#64748b'}33` }}>{u.role}</span></td>
                    <td style={{ fontSize:13, color:'#94a3b8' }}>{u.department||'—'}</td>
                    <td style={{ fontSize:12, color:'#64748b' }}><ClientDate date={u.created_at} showTime={false} /></td>
                    <td><span className="badge" style={{ background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }}>Active</span></td>
                    <td><button className="btn-icon" onClick={() => openEdit(u)}><Edit3 size={13}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(''); }}>
          <div className="modal-box animate-fade-in">
            <div className="section-header" style={{ marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:600, color:'#f1f5f9' }}>{modal==='create' ? 'Add User' : 'Edit User'}</h3>
              <button className="btn-icon" onClick={() => setModal('')}><X size={16}/></button>
            </div>
            <form onSubmit={modal==='create' ? handleCreate : handleEdit}>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required/>
              </div>
              {modal==='create' && (
                <>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Email *</label>
                    <input className="input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required/>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Password *</label>
                    <input className="input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required/>
                  </div>
                </>
              )}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Role</label>
                <select className="select" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))} style={{ width:'100%' }}>
                  <option value="EMPLOYEE">Employee</option><option value="CMD">CMD</option><option value="HR">HR</option><option value="ADMIN">Admin</option>
                </select>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{ display:'block', fontSize:13, color:'#94a3b8', marginBottom:6 }}>Department</label>
                <input className="input" value={form.department} onChange={e => setForm(f=>({...f,department:e.target.value}))} placeholder="e.g., Engineering"/>
              </div>
              {error && <div className="error-box" style={{ marginBottom:14 }}>{error}</div>}
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex:1 }} onClick={() => setModal('')}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }} disabled={submitting}>
                  {submitting ? 'Saving...' : modal==='create' ? <><UserPlus size={14}/> Create</> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
