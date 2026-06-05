'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import TableSkeleton from '@/components/TableSkeleton';
import { getAdminAuditLogs } from '@/lib/api';
import ClientDate from '@/components/ClientDate';
import { ClipboardList, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export default function AdminAuditLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // Search & Filter State
  const [searchComplaintId, setSearchComplaintId] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterActorUserId, setFilterActorUserId] = useState('');

  const load = () => {
    setLoading(true);
    getAdminAuditLogs({
      page,
      page_size: pageSize,
      complaint_id: searchComplaintId || undefined,
      action_type: filterActionType || undefined,
      actor_user_id: filterActorUserId || undefined,
    })
      .then(r => {
        setLogs(r.data || []);
        const total = parseInt(r.headers['x-total-count'] || '0', 10);
        setTotalCount(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [searchComplaintId, filterActionType, filterActorUserId]);

  // Load logs when page or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, searchComplaintId, filterActionType, filterActorUserId]);

  const actionTypes = [
    "CREATED",
    "STATUS_CHANGE",
    "CATEGORY_UPDATE",
    "PRIORITY_OVERRIDE",
    "ESCALATION_CHANGE",
    "ASSIGNMENT_CHANGE",
    "VISIBILITY_CHANGE",
    "REJECTION_EDIT",
    "RESOLUTION_EDIT",
    "ATTACHMENT_ADDED",
    "NOTE_ADDED",
    "RATED"
  ];

  return (
    <DashboardLayout title="Audit Logs">
      {/* Search and Filters */}
      <div className="glass" style={{ padding: 18, marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}/>
          <input 
            className="input" 
            placeholder="Search by Complaint ID..." 
            value={searchComplaintId} 
            onChange={e => setSearchComplaintId(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
        
        <select className="select" value={filterActionType} onChange={e => setFilterActionType(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All Action Types</option>
          {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <input 
          className="input" 
          placeholder="Actor User ID..." 
          value={filterActorUserId} 
          onChange={e => setFilterActorUserId(e.target.value)}
          style={{ minWidth: 160, width: 'auto' }}
        />

        <button className="btn btn-secondary" onClick={() => { setSearchComplaintId(''); setFilterActionType(''); setFilterActorUserId(''); }} style={{ height: 38 }}>
          Clear Filters
        </button>
      </div>

      <div className="glass" style={{ padding:24 }}>
        <div className="section-header" style={{ marginBottom: 18 }}>
          <div className="section-title">System Audit Logs ({totalCount})</div>
        </div>
        {loading ? (
          <TableSkeleton cols={6} rows={6} />
        ) : logs.length === 0 ? (
          <div className="empty-state"><ClipboardList size={40}/><p>No audit logs found matching the criteria</p></div>
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead><tr><th>Timestamp</th><th>Action</th><th>Complaint</th><th>Actor</th><th>Old Value</th><th>New Value</th></tr></thead>
                <tbody>
                  {logs.map((l:any) => (
                    <tr key={l.id}>
                      <td style={{ fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}><ClientDate date={l.created_at} /></td>
                      <td>
                        <span className="badge" style={{ 
                          background: l.action_type === 'STATUS_CHANGE' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', 
                          color: l.action_type === 'STATUS_CHANGE' ? '#60a5fa' : '#34d399', 
                          border: l.action_type === 'STATUS_CHANGE' ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(16,185,129,0.2)' 
                        }}>
                          {l.action_type}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => router.push(`/admin/complaints/${l.complaint_id}`)} style={{ background:'none', border:'none', color:'#fbbf24', cursor:'pointer', fontSize:12, textDecoration:'underline' }}>
                          #{l.complaint_id?.slice(0,8)}
                        </button>
                      </td>
                      <td style={{ fontSize:12, color:'#94a3b8' }}>{l.actor_user_id?.slice(0,8) || 'System'}</td>
                      <td style={{ fontSize:11, color:'#475569', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.old_value_json ? JSON.stringify(l.old_value_json) : '—'}
                      </td>
                      <td style={{ fontSize:11, color:'#475569', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.new_value_json ? JSON.stringify(l.new_value_json) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalCount > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  Showing <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{(page - 1) * pageSize + 1}</span> to <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{Math.min(page * pageSize, totalCount)}</span> of <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{totalCount}</span> logs
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setPage(p => Math.max(p - 1, 1))} 
                    disabled={page === 1}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setPage(p => Math.min(p + 1, Math.ceil(totalCount / pageSize)))} 
                    disabled={page >= Math.ceil(totalCount / pageSize)}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
