'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getAdminAuditLogs } from '@/lib/api';
import ClientDate from '@/components/ClientDate';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminAuditLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getAdminAuditLogs({ page, page_size: 50 })
      .then(r => setLogs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <DashboardLayout title="Audit Logs">
      <div className="glass" style={{ padding:24 }}>
        <div className="section-header">
          <div className="section-title">System Audit Logs</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="btn-icon" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}><ChevronLeft size={14}/></button>
            <span style={{ fontSize:12, color:'#94a3b8' }}>Page {page}</span>
            <button className="btn-icon" onClick={() => setPage(p => p+1)} disabled={logs.length < 50}><ChevronRight size={14}/></button>
          </div>
        </div>
        {loading ? <div className="empty-state"><div className="spinner"/></div> : logs.length === 0 ? (
          <div className="empty-state"><ClipboardList size={40}/><p>No audit logs</p></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>Timestamp</th><th>Action</th><th>Complaint</th><th>Actor</th><th>Old Value</th><th>New Value</th></tr></thead>
              <tbody>
                {logs.map((l:any) => (
                  <tr key={l.id}>
                    <td style={{ fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}><ClientDate date={l.created_at} /></td>
                    <td><span className="badge" style={{ background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }}>{l.action_type}</span></td>
                    <td>
                      <button onClick={() => router.push(`/admin/complaints/${l.complaint_id}`)} style={{ background:'none', border:'none', color:'#10b981', cursor:'pointer', fontSize:12, textDecoration:'underline' }}>
                        #{l.complaint_id?.slice(0,8)}
                      </button>
                    </td>
                    <td style={{ fontSize:12, color:'#94a3b8' }}>{l.actor_user_id?.slice(0,8) || 'System'}</td>
                    <td style={{ fontSize:11, color:'#475569', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {l.old_value_json ? JSON.stringify(l.old_value_json).slice(0,60) : '—'}
                    </td>
                    <td style={{ fontSize:11, color:'#475569', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {l.new_value_json ? JSON.stringify(l.new_value_json).slice(0,60) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
