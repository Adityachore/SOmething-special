'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getProfile, createProfileRequest, getMyProfileRequests } from '@/lib/api';
import ClientDate from '@/components/ClientDate';
import { User, Mail, Calendar, Phone, Briefcase, Key, Eye, HelpCircle, X, Check, Clock, AlertTriangle } from 'lucide-react';

export default function EmployeeProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Correction Form State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ field: 'phone', new_value: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, reqsRes] = await Promise.all([
        getProfile(),
        getMyProfileRequests()
      ]);
      setProfile(profRes.data);
      setRequests(reqsRes.data || []);
    } catch (err) {
      console.error('Failed to load profile details.', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.new_value.trim()) {
      setError('Please provide a corrected value.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await createProfileRequest({
        field: form.field,
        new_value: form.new_value,
        reason: form.reason || undefined
      });
      setSuccess('Correction request submitted successfully! It will be reviewed by HR.');
      setForm({ field: 'phone', new_value: '', reason: '' });
      // Refresh requests list
      const reqsRes = await getMyProfileRequests();
      setRequests(reqsRes.data || []);
      setTimeout(() => setShowModal(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to submit correction request.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Approved') {
      return <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}><Check size={12} style={{ marginRight: 4 }}/> Approved</span>;
    }
    if (status === 'Rejected') {
      return <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}><X size={12} style={{ marginRight: 4 }}/> Rejected</span>;
    }
    return <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}><Clock size={12} style={{ marginRight: 4 }}/> Pending</span>;
  };

  const formatFieldName = (f: string) => {
    if (f === 'phone') return 'Phone Number';
    if (f === 'email') return 'Email Address';
    if (f === 'name') return 'Full Name';
    if (f === 'designation') return 'Designation';
    if (f === 'department') return 'Department';
    if (f === 'profile_photo') return 'Profile Photo URL';
    return f;
  };

  return (
    <DashboardLayout title="My Profile">
      {loading ? (
        <div className="empty-state"><div className="spinner"/></div>
      ) : !profile ? (
        <div className="empty-state">
          <AlertTriangle size={40} style={{ color: '#ef4444' }}/>
          <p style={{ marginTop: 8, color: '#f87171' }}>Failed to load profile details.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Main profile card */}
          <div>
            <div className="glass" style={{ padding: 28, position: 'relative', overflow: 'hidden', marginBottom: 20 }}>
              {/* Header/Banner effect */}
              <div style={{ 
                height: 80, 
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.2))', 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0,
                zIndex: 0
              }}/>
              
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', position: 'relative', zIndex: 1, marginTop: 24, marginBottom: 24 }}>
                <div style={{ 
                  width: 72, 
                  height: 72, 
                  borderRadius: 18, 
                  background: 'linear-gradient(135deg,var(--purple),var(--purple-light))', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 28, 
                  fontWeight: 700, 
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}>
                  {profile.name?.[0] || 'U'}
                </div>
                <div style={{ paddingBottom: 4 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{profile.name}</h2>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
                    {profile.designation || 'Staff Member'} • <span style={{ color: 'var(--purple-light)', fontWeight: 600 }}>{profile.employee_id || 'NO_ID'}</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #27272a', paddingTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Mail size={16} style={{ color: '#64748b' }}/>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</div>
                      <div style={{ fontSize: 13.5, color: '#e2e8f0', marginTop: 2 }}>{profile.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Phone size={16} style={{ color: '#64748b' }}/>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</div>
                      <div style={{ fontSize: 13.5, color: '#e2e8f0', marginTop: 2 }}>{profile.phone || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Briefcase size={16} style={{ color: '#64748b' }}/>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</div>
                      <div style={{ fontSize: 13.5, color: '#e2e8f0', marginTop: 2 }}>{profile.department || '—'}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Calendar size={16} style={{ color: '#64748b' }}/>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date of Joining</div>
                      <div style={{ fontSize: 13.5, color: '#e2e8f0', marginTop: 2 }}>
                        {profile.date_of_joining ? <ClientDate date={profile.date_of_joining} showTime={false}/> : '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Key size={16} style={{ color: '#64748b' }}/>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Role</div>
                      <div style={{ fontSize: 13.5, color: '#e2e8f0', marginTop: 2 }}>{profile.role}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Eye size={16} style={{ color: '#64748b' }}/>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Status</div>
                      <div style={{ fontSize: 13.5, color: '#34d399', fontWeight: 600, marginTop: 2 }}>{profile.status}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Request timeline */}
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 18 }}>
                Profile Correction History
              </h3>
              
              {requests.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  No correction requests raised yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {requests.map(r => (
                    <div key={r.id} style={{ 
                      background: 'rgba(24, 24, 27, 0.4)', 
                      border: '1px solid #27272a', 
                      borderRadius: 8, 
                      padding: 14 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#e2e8f0' }}>
                            Update {formatFieldName(r.field)}
                          </span>
                          <span style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>
                            on <ClientDate date={r.created_at} showTime={false}/>
                          </span>
                        </div>
                        {getStatusBadge(r.status)}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8, fontSize: 12 }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Old:</span> <span style={{ color: '#a1a1aa' }}>{r.old_value || '—'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#34d399' }}>New:</span> <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{r.new_value}</span>
                        </div>
                      </div>

                      {r.reason && (
                        <div style={{ fontSize: 12, color: '#94a3b8', background: '#18181b50', padding: '6px 8px', borderRadius: 4, marginTop: 6 }}>
                          <strong>Reason:</strong> {r.reason}
                        </div>
                      )}

                      {r.status !== 'Pending' && r.review_notes && (
                        <div style={{ 
                          fontSize: 12, 
                          color: r.status === 'Approved' ? '#a7f3d0' : '#fecaca', 
                          background: r.status === 'Approved' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                          padding: '6px 8px', 
                          border: r.status === 'Approved' ? '1px solid rgba(16,185,129,0.1)' : '1px solid rgba(239,68,68,0.1)',
                          borderRadius: 4, 
                          marginTop: 6 
                        }}>
                          <strong>HR Notes:</strong> {r.review_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Info Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="info-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <HelpCircle size={18} style={{ color: 'var(--purple)' }}/>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Need to update details?</div>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                To maintain data consistency and database audit logs, employee profiles are read-only.
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginTop: 8 }}>
                If you notice spelling mistakes or outdated numbers, click below to submit a correction request to HR.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setForm({ field: 'phone', new_value: '', reason: '' });
                  setError('');
                  setSuccess('');
                  setShowModal(true);
                }} 
                style={{ width: '100%', marginTop: 14 }}
              >
                Request Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Correction Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box animate-fade-in" style={{ maxWidth: 440 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>Request Profile Correction</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>

            <form onSubmit={handleSubmitRequest}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Field to Correct</label>
                <select 
                  className="select" 
                  value={form.field} 
                  onChange={e => setForm(f => ({...f, field: e.target.value}))} 
                  style={{ width: '100%' }}
                >
                  <option value="phone">Phone Number</option>
                  <option value="email">Email Address</option>
                  <option value="name">Full Name</option>
                  <option value="designation">Designation</option>
                  <option value="department">Department</option>
                  <option value="profile_photo">Profile Photo URL</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Corrected Value *</label>
                <input 
                  className="input" 
                  value={form.new_value} 
                  onChange={e => setForm(f => ({...f, new_value: e.target.value}))} 
                  placeholder="Type the corrected details..."
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Reason for Change</label>
                <textarea 
                  className="input textarea" 
                  rows={3}
                  value={form.reason} 
                  onChange={e => setForm(f => ({...f, reason: e.target.value}))} 
                  placeholder="e.g. Spelling mistake correction, new SIM registration..."
                />
              </div>

              {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}
              {success && (
                <div className="badge" style={{ display: 'block', width: '100%', padding: '10px 12px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 14, textAlign: 'center' }}>
                  {success}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
