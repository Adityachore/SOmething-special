'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getAllProfileRequests, reviewProfileRequest } from '@/lib/api';
import ClientDate from '@/components/ClientDate';
import { Check, X, Clock, HelpCircle, Eye, AlertTriangle, MessageSquare } from 'lucide-react';

export default function AdminProfileRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending');
  
  // Review Modal State
  const [reviewReq, setReviewReq] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getAllProfileRequests(statusFilter || undefined)
      .then(r => setRequests(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleReview = async (action: 'Approved' | 'Rejected') => {
    if (!reviewReq) return;
    if (action === 'Rejected' && !notes.trim()) {
      setError('Please provide review notes explaining the rejection reason.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await reviewProfileRequest(reviewReq.id, action, notes || undefined);
      setReviewReq(null);
      setNotes('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to review request.');
    } finally {
      setSubmitting(false);
    }
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

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return '#34d399';
    if (status === 'Rejected') return '#f87171';
    return '#fbbf24';
  };

  return (
    <DashboardLayout title="Profile Update Requests">
      {/* Filters */}
      <div className="glass" style={{ padding: 18, marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Filter by Status:</span>
        {['Pending', 'Approved', 'Rejected', ''].map(status => (
          <button 
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: 12.5 }}
          >
            {status === '' ? 'All Requests' : status}
          </button>
        ))}
      </div>

      <div className="glass" style={{ padding: 24 }}>
        <div className="section-header" style={{ marginBottom: 18 }}>
          <div className="section-title">
            {statusFilter || 'All'} Requests ({requests.length})
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner"/></div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} style={{ color: '#475569' }}/>
            <p style={{ marginTop: 8, color: '#94a3b8' }}>No profile update requests found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Field</th>
                  <th>Old Value</th>
                  <th>Requested Value</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Status</th>
                  {statusFilter === 'Pending' && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{r.user?.name || 'Unknown User'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {r.user?.employee_id ? <span style={{ color: '#34d399', fontWeight: 600 }}>{r.user.employee_id}</span> : 'No ID'} • {r.user?.email}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 500, color: 'var(--purple-light)' }}>
                      {formatFieldName(r.field)}
                    </td>
                    <td style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through' }}>
                      {r.old_value || '—'}
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 500, color: '#34d399' }}>
                      {r.new_value}
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>
                      {r.reason || '—'}
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>
                      <ClientDate date={r.created_at} showTime={false} />
                    </td>
                    <td>
                      <span className="badge" style={{ 
                        background: `${getStatusColor(r.status)}15`, 
                        color: getStatusColor(r.status), 
                        border: `1px solid ${getStatusColor(r.status)}30` 
                      }}>
                        {r.status}
                      </span>
                    </td>
                    {statusFilter === 'Pending' && (
                      <td>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => { setReviewReq(r); setNotes(''); setError(''); }}
                          style={{ padding: '4px 10px', fontSize: 11, height: 26 }}
                        >
                          Review
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewReq && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setReviewReq(null); }}>
          <div className="modal-box animate-fade-in" style={{ maxWidth: 460 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>Review Profile Correction</h3>
              <button className="btn-icon" onClick={() => setReviewReq(null)}><X size={16}/></button>
            </div>

            <div style={{ marginBottom: 16, background: '#18181b50', padding: 14, borderRadius: 6, fontSize: 13, border: '1px solid #27272a' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px 12px' }}>
                <span style={{ color: '#64748b' }}>Employee:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{reviewReq.user?.name} ({reviewReq.user?.employee_id || 'No ID'})</span>
                
                <span style={{ color: '#64748b' }}>Field:</span>
                <span style={{ color: 'var(--purple-light)', fontWeight: 500 }}>{formatFieldName(reviewReq.field)}</span>
                
                <span style={{ color: '#64748b' }}>Old Value:</span>
                <span style={{ color: '#f87171', textDecoration: 'line-through' }}>{reviewReq.old_value || '—'}</span>
                
                <span style={{ color: '#64748b' }}>New Value:</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>{reviewReq.new_value}</span>

                <span style={{ color: '#64748b' }}>Reason:</span>
                <span style={{ color: '#94a3b8' }}>{reviewReq.reason || '—'}</span>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                HR Review Notes / Rejection Reason
              </label>
              <textarea 
                className="input textarea" 
                rows={3}
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Type reviewer feedback... (Required for rejection)"
              />
            </div>

            {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => setReviewReq(null)}
              >
                Cancel
              </button>
              
              <button 
                type="button" 
                className="btn" 
                style={{ flex: 1.2, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                disabled={submitting}
                onClick={() => handleReview('Rejected')}
              >
                Reject Request
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 1.5 }}
                disabled={submitting}
                onClick={() => handleReview('Approved')}
              >
                {submitting ? 'Approving...' : 'Approve & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
