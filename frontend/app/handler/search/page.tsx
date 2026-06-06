'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { PriorityBadge, StatusBadge, HRBadge } from '@/components/Badges';
import { searchComplaints } from '@/lib/api';
import { Search, Eye, FileText } from 'lucide-react';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [dept, setDept] = useState('');
  const [hrOnly, setHrOnly] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = () => {
    setLoading(true); setSearched(true);
    searchComplaints({
      q: q || undefined,
      status: status || undefined,
      priority: priority || undefined,
      department: dept || undefined,
      is_hr_sensitive: hrOnly || undefined,
      page_size: 50,
    })
      .then(r => setResults(r.data.items || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (q) doSearch(); }, []);

  return (
    <>
      <div className="glass" style={{ padding:20, marginBottom:20 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:4 }}>Search</label>
            <div style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#475569' }}/>
              <input className="input" placeholder="Search keywords..." value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()} style={{ paddingLeft:34 }}/>
            </div>
          </div>
          <div style={{ width:130 }}>
            <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:4 }}>Status</label>
            <select className="select" value={status} onChange={e => setStatus(e.target.value)} style={{ width:'100%' }}>
              <option value="">Any</option><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="SOLVED">Solved</option><option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div style={{ width:130 }}>
            <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:4 }}>Priority</label>
            <select className="select" value={priority} onChange={e => setPriority(e.target.value)} style={{ width:'100%' }}>
              <option value="">Any</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
            </select>
          </div>
          <div style={{ width:130 }}>
            <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:4 }}>Department</label>
            <input className="input" placeholder="Any" value={dept} onChange={e => setDept(e.target.value)}/>
          </div>
          <label className="checkbox-label" style={{ paddingBottom:4 }}>
            <input type="checkbox" checked={hrOnly} onChange={e => setHrOnly(e.target.checked)}/> HR Only
          </label>
          <button className="btn btn-primary" onClick={doSearch}><Search size={14}/> Search</button>
        </div>
      </div>

      <div className="glass" style={{ padding:24 }}>
        {loading ? <div className="empty-state"><div className="spinner"/></div> : !searched ? (
          <div className="empty-state"><Search size={40}/><p>Enter search criteria above</p></div>
        ) : results.length === 0 ? (
          <div className="empty-state"><FileText size={40}/><p>No results found</p></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <div className="section-sub" style={{ marginBottom:12 }}>{results.length} results</div>
            <table className="data-table">
              <thead><tr><th>ID / Title</th><th>Dept</th><th>Priority</th><th>Status</th><th>HR</th><th>Actions</th></tr></thead>
              <tbody>
                {results.map(c => (
                  <tr key={c.id}>
                    <td><div style={{ fontWeight:500, color:'#e2e8f0' }}>{c.title}</div><div style={{ fontSize:11, color:'var(--purple-light)' }}>#{c.id.slice(0,8)}</div></td>
                    <td style={{ fontSize:13, color:'#94a3b8' }}>{c.primary_department||'—'}</td>
                    <td><PriorityBadge priority={c.priority_level}/></td>
                    <td><StatusBadge status={c.status}/></td>
                    <td><HRBadge sensitive={c.is_hr_sensitive}/></td>
                    <td><button className="btn-icon" onClick={() => router.push(`/handler/complaints/${c.id}`)}><Eye size={13}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function HandlerSearch() {
  return (
    <DashboardLayout title="Search Complaints">
      <Suspense fallback={<div className="empty-state"><div className="spinner"/></div>}>
        <SearchContent />
      </Suspense>
    </DashboardLayout>
  );
}
