'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import TableSkeleton from '@/components/TableSkeleton';
import { 
  getEmployees, 
  createEmployee, 
  updateEmployee, 
  toggleEmployeeStatus, 
  bulkDeactivateEmployees, 
  bulkUploadEmployees,
  getDepartments
} from '@/lib/api';
import ClientDate from '@/components/ClientDate';
import { 
  Plus, Edit3, X, UserPlus, Upload, Download, Search, 
  Check, AlertTriangle, RefreshCw, FileSpreadsheet
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = { 
  ADMIN: '#f59e0b', 
  CMD: '#3b82f6', 
  HR: '#06b6d4', 
  EMPLOYEE: '#10b981' 
};

export default function AdminUsers() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'' | 'create' | 'edit' | 'import'>('');
  const [editUser, setEditUser] = useState<any>(null);
  
  // Single User Form State
  const [form, setForm] = useState({ 
    employee_id: '',
    name: '', 
    email: '', 
    password: '', 
    role: 'EMPLOYEE', 
    department: '',
    department_id: '',
    designation: '',
    phone: '',
    date_of_joining: '',
    status: 'Active',
    can_assign_complaints: false,
    can_resolve_complaints: false,
    can_view_hr_sensitive: false,
  });

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Bulk Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const load = () => {
    setLoading(true); setError('');
    getEmployees({
      search: search || undefined,
      department: deptFilter || undefined,
      status: statusFilter || undefined,
      page,
      page_size: pageSize
    })
      .then(r => {
        setEmployees(r.data || []);
        const total = parseInt(r.headers['x-total-count'] || '0', 10);
        setTotalCount(total);
      })
      .catch(() => setError('Failed to load employees. Please check your connection.'))
      .finally(() => setLoading(false));

    // Also load departments
    getDepartments()
      .then(r => setDepts(r.data || []))
      .catch(() => {});
  };

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, deptFilter, statusFilter]);

  // Trigger load when page or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, deptFilter, statusFilter]);

  const openCreate = () => { 
    setForm({ 
      employee_id: '',
      name: '', 
      email: '', 
      password: '', 
      role: 'EMPLOYEE', 
      department: '',
      department_id: '',
      designation: '',
      phone: '',
      date_of_joining: '',
      status: 'Active',
      can_assign_complaints: false,
      can_resolve_complaints: false,
      can_view_hr_sensitive: false,
    }); 
    setError(''); 
    setSuccessMsg('');
    setModal('create'); 
  };

  const openEdit = (u: any) => { 
    setEditUser(u); 
    
    let formattedDoj = '';
    if (u.date_of_joining) {
      formattedDoj = u.date_of_joining.split('T')[0];
    }
    
    setForm({ 
      employee_id: u.employee_id || '',
      name: u.name, 
      email: u.email, 
      password: '', 
      role: u.role, 
      department: u.department || '', 
      department_id: u.department_id || '',
      designation: u.designation || '',
      phone: u.phone || '',
      date_of_joining: formattedDoj,
      status: u.status || 'Active',
      can_assign_complaints: u.can_assign_complaints || false,
      can_resolve_complaints: u.can_resolve_complaints || false,
      can_view_hr_sensitive: u.can_view_hr_sensitive || false,
    }); 
    setError(''); 
    setSuccessMsg('');
    setModal('edit'); 
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSubmitting(true); 
    setError('');
    setSuccessMsg('');
    try { 
      await createEmployee({ 
        employee_id: form.employee_id || undefined,
        name: form.name, 
        email: form.email, 
        password: form.password, 
        role: form.role, 
        department: form.department || undefined,
        department_id: form.department_id || undefined,
        designation: form.designation || undefined,
        phone: form.phone || undefined,
        date_of_joining: form.date_of_joining ? `${form.date_of_joining}T00:00:00Z` : undefined,
        status: form.status,
        can_assign_complaints: form.can_assign_complaints,
        can_resolve_complaints: form.can_resolve_complaints,
        can_view_hr_sensitive: form.can_view_hr_sensitive,
      }); 
      load(); 
      setModal(''); 
    } catch (err: any) { 
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to add employee.'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSubmitting(true); 
    setError('');
    setSuccessMsg('');
    try { 
      await updateEmployee(editUser.id, { 
        employee_id: form.employee_id || undefined,
        name: form.name, 
        role: form.role, 
        department: form.department || undefined,
        department_id: form.department_id || undefined,
        designation: form.designation || undefined,
        phone: form.phone || undefined,
        date_of_joining: form.date_of_joining ? `${form.date_of_joining}T00:00:00Z` : undefined,
        status: form.status,
        password: form.password || undefined,
        can_assign_complaints: form.can_assign_complaints,
        can_resolve_complaints: form.can_resolve_complaints,
        can_view_hr_sensitive: form.can_view_hr_sensitive,
      }); 
      load(); 
      setModal(''); 
    } catch (err: any) { 
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to update employee.'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleToggleStatus = async (empId: string) => {
    try {
      await toggleEmployeeStatus(empId);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle status.');
    }
  };

  const handleBulkDeactivate = async () => {
    if (!window.confirm(`Are you sure you want to deactivate the ${selectedIds.length} selected employees?`)) return;
    try {
      await bulkDeactivateEmployees(selectedIds);
      setSelectedIds([]);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to deactivate employees.');
    }
  };

  const handleExport = () => {
    let url = 'http://localhost:8000/api/v1/employees/export';
    const params = [];
    if (deptFilter) params.push(`department=${encodeURIComponent(deptFilter)}`);
    if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
    if (params.length) url += `?${params.join('&')}`;
    
    // Trigger download
    const token = localStorage.getItem('access_token');
    const a = document.createElement('a');
    a.href = url;
    // Add token authorization to URL if required, but standard CSV download can be done using a fetch or standard anchor.
    // To ensure authorization headers are sent, let's fetch it as a blob.
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const fileUrl = window.URL.createObjectURL(blob);
        a.href = fileUrl;
        a.download = `employees_export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
      })
      .catch(err => alert('Export failed.'));
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setSubmitting(true);
    setError('');
    setImportSummary(null);
    try {
      const res = await bulkUploadEmployees(importFile);
      setImportSummary(res.data);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Import failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Unique departments for filter
  const departmentsList = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  return (
    <DashboardLayout title="Employee Database">
      {error && <div className="error-box" style={{ marginBottom: 18 }}>{error}</div>}
      {/* Search and Filters */}
      <div className="glass" style={{ padding: 18, marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}/>
          <input 
            className="input" 
            placeholder="Search by ID, Name or Email..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
        
        <select className="select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ minWidth: 150 }}>
          <option value="">All Departments</option>
          {departmentsList.map((d: any) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 120 }}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <button className="btn btn-secondary" onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); }} style={{ height: 38 }}>
          Clear Filters
        </button>
      </div>

      <div className="glass" style={{ padding: 24 }}>
        <div className="section-header" style={{ marginBottom: 18 }}>
          <div className="section-title">Employees ({totalCount})</div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedIds.length > 0 && (
              <button className="btn" style={{ background: '#ef444415', color: '#f87171', border: '1px solid #ef444430' }} onClick={handleBulkDeactivate}>
                Deactivate ({selectedIds.length})
              </button>
            )}

            <button className="btn btn-secondary" onClick={() => setModal('import')}>
              <Upload size={14} style={{ marginRight: 4 }}/> Import CSV/Excel
            </button>
            
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={14} style={{ marginRight: 4 }}/> Export Data
            </button>
            
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={14} style={{ marginRight: 4 }}/> Add Employee
            </button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={8} rows={6} />
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <Search size={40} style={{ color: '#475569' }}/>
            <p style={{ marginTop: 8, color: '#94a3b8' }}>No employees found matching the criteria</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input 
                      type="checkbox" 
                      checked={employees.length > 0 && selectedIds.length === employees.length} 
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Employee Details</th>
                  <th>Role</th>
                  <th>Department / Title</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(u.id)} 
                        onChange={() => toggleSelect(u.id)}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: 8, 
                          background: 'linear-gradient(135deg,var(--purple),var(--purple-light))', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: 13, 
                          fontWeight: 700, 
                          color: 'white', 
                          flexShrink: 0 
                        }}>
                          {u.name?.[0] || 'U'}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {u.employee_id ? <span style={{ color: '#34d399', fontWeight: 600 }}>{u.employee_id}</span> : 'No ID'} • {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ 
                        background: `${ROLE_COLORS[u.role] || '#64748b'}18`, 
                        color: ROLE_COLORS[u.role] || '#64748b', 
                        border: `1px solid ${ROLE_COLORS[u.role] || '#64748b'}33` 
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: '#e2e8f0' }}>{u.department || '—'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{u.designation || '—'}</div>
                    </td>
                    <td style={{ fontSize: 13, color: '#94a3b8' }}>{u.phone || '—'}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>
                      {u.date_of_joining ? <ClientDate date={u.date_of_joining} showTime={false} /> : '—'}
                    </td>
                    <td>
                      <button 
                        onClick={() => handleToggleStatus(u.id)}
                        className="badge" 
                        style={{ 
                          cursor: 'pointer',
                          background: u.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                          color: u.status === 'Active' ? '#34d399' : '#f87171', 
                          border: u.status === 'Active' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)' 
                        }}
                      >
                        {u.status || 'Active'}
                      </button>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => openEdit(u)}><Edit3 size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalCount > pageSize && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Showing <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{(page - 1) * pageSize + 1}</span> to <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{Math.min(page * pageSize, totalCount)}</span> of <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{totalCount}</span> employees
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
      </div>

      {/* Create / Edit Form Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(''); }}>
          <div className="modal-box animate-fade-in" style={{ maxWidth: 500 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>
                {modal === 'create' ? 'Add New Employee' : 'Edit Employee Details'}
              </h3>
              <button className="btn-icon" onClick={() => setModal('')}><X size={16}/></button>
            </div>
            
            <form onSubmit={modal === 'create' ? handleCreate : handleEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Employee ID *</label>
                  <input 
                    className="input" 
                    value={form.employee_id} 
                    onChange={e => setForm(f => ({...f, employee_id: e.target.value}))} 
                    placeholder="e.g. EMP001"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Full Name *</label>
                  <input 
                    className="input" 
                    value={form.name} 
                    onChange={e => setForm(f => ({...f, name: e.target.value}))} 
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Email Address *</label>
                  <input 
                    className="input" 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm(f => ({...f, email: e.target.value}))} 
                    placeholder="john@company.com"
                    required
                    disabled={modal === 'edit'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                    {modal === 'create' ? 'Password *' : 'Password (Leave Blank)'}
                  </label>
                  <input 
                    className="input" 
                    type="password" 
                    value={form.password} 
                    onChange={e => setForm(f => ({...f, password: e.target.value}))} 
                    placeholder={modal === 'create' ? 'Temporary Password' : '—'}
                    required={modal === 'create'}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Role</label>
                  <select 
                    className="select" 
                    value={form.role} 
                    onChange={e => setForm(f => ({...f, role: e.target.value}))} 
                    style={{ width: '100%' }}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="CMD">CMD Manager</option>
                    <option value="HR">HR Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Account Status</label>
                  <select 
                    className="select" 
                    value={form.status} 
                    onChange={e => setForm(f => ({...f, status: e.target.value}))} 
                    style={{ width: '100%' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Department</label>
                  <select
                    className="select"
                    value={form.department_id}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedDept = depts.find(d => d.id === selectedId);
                      setForm(f => ({
                        ...f,
                        department_id: selectedId,
                        department: selectedDept ? selectedDept.name : ''
                      }));
                    }}
                    style={{ width: '100%', height: 38 }}
                  >
                    <option value="">Select Department</option>
                    {depts.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Designation</label>
                  <input 
                    className="input" 
                    value={form.designation} 
                    onChange={e => setForm(f => ({...f, designation: e.target.value}))} 
                    placeholder="e.g. Senior Architect"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Phone Number</label>
                  <input 
                    className="input" 
                    value={form.phone} 
                    onChange={e => setForm(f => ({...f, phone: e.target.value}))} 
                    placeholder="e.g. +91 99999 88888"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Date of Joining</label>
                  <input 
                    className="input" 
                    type="date"
                    value={form.date_of_joining} 
                    onChange={e => setForm(f => ({...f, date_of_joining: e.target.value}))} 
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>User Capabilities & Access</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.can_assign_complaints} 
                      onChange={e => setForm(f => ({...f, can_assign_complaints: e.target.checked}))}
                    />
                    Can assign complaints to handlers
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.can_resolve_complaints} 
                      onChange={e => setForm(f => ({...f, can_resolve_complaints: e.target.checked}))}
                    />
                    Can resolve and reject complaints
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.can_view_hr_sensitive} 
                      onChange={e => setForm(f => ({...f, can_view_hr_sensitive: e.target.checked}))}
                    />
                    Can view sensitive HR cases
                  </label>
                </div>
              </div>

              {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}
              
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal('')}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                  {submitting ? 'Saving...' : modal === 'create' ? <><UserPlus size={14}/> Add Employee</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {modal === 'import' && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(''); }}>
          <div className="modal-box animate-fade-in" style={{ maxWidth: 460 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={18} style={{ color: '#10b981' }}/> Bulk Import Employees
              </h3>
              <button className="btn-icon" onClick={() => setModal('')}><X size={16}/></button>
            </div>

            <form onSubmit={handleImportSubmit}>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
                Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file containing columns: <br/>
                <code style={{ background: '#18181b', padding: '2px 4px', borderRadius: 4, color: '#f4f4f5', display: 'inline-block', marginTop: 4 }}>
                  Employee ID, Name, Email, Department, Designation, Phone, Role, Date of Joining
                </code>
              </p>

              <div style={{ 
                border: '2px dashed rgba(16,185,129,0.2)', 
                borderRadius: 8, 
                padding: '24px 16px', 
                textAlign: 'center', 
                background: 'rgba(16,185,129,0.02)',
                marginBottom: 16
              }}>
                <input 
                  type="file" 
                  accept=".csv,.xlsx" 
                  id="import-file-input"
                  style={{ display: 'none' }}
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="import-file-input" style={{ cursor: 'pointer' }}>
                  <Upload size={32} style={{ color: 'var(--purple)', margin: '0 auto 10px' }}/>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
                    {importFile ? importFile.name : 'Click to select spreadsheet'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    CSV or Excel up to 5MB
                  </div>
                </label>
              </div>

              {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}
              
              {importSummary && (
                <div style={{ 
                  background: 'rgba(24, 24, 27, 0.5)', 
                  border: '1px solid #27272a',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 14,
                  fontSize: 12.5
                }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Import Summary:</div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                    <span style={{ color: '#34d399' }}>✓ Added: <strong>{importSummary.added}</strong></span>
                    <span style={{ color: '#60a5fa' }}>✎ Updated: <strong>{importSummary.updated}</strong></span>
                    <span style={{ color: '#f87171' }}>✗ Failed: <strong>{importSummary.failed}</strong></span>
                  </div>
                  {importSummary.errors.length > 0 && (
                    <div style={{ borderTop: '1px solid #27272a', paddingTop: 8, marginTop: 8 }}>
                      <div style={{ color: '#f87171', fontWeight: 500, marginBottom: 4 }}>Errors:</div>
                      <div style={{ maxHeight: 80, overflowY: 'auto', color: '#a1a1aa', fontSize: 11 }}>
                        {importSummary.errors.map((err: string, i: number) => <div key={i}>{err}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setModal(''); setImportFile(null); setImportSummary(null); }}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting || !importFile}>
                  {submitting ? 'Uploading...' : 'Process File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
