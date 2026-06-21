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
  getDepartments,
  inviteMember
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
  INVESTIGATOR: '#8b5cf6',
  HANDLER: '#8b5cf6',
  EVALUATOR: '#8b5cf6',
  EMPLOYEE: '#10b981' 
};

export default function AdminUsers() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'' | 'create' | 'edit' | 'import'>('');
  const [editUser, setEditUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  
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
    reporting_manager_id: '',
    phone: '',
    date_of_joining: '',
    status: 'Active',
    can_assign_complaints: false,
    can_resolve_complaints: false,
    can_view_hr_sensitive: false,
    can_evaluate: false,
    can_investigate: false,
    can_approve_resolution: false,
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
    setStep(1);
    setForm({ 
      employee_id: '',
      name: '', 
      email: '', 
      password: '', 
      role: 'EMPLOYEE', 
      department: '',
      department_id: '',
      designation: '',
      reporting_manager_id: '',
      phone: '',
      date_of_joining: '',
      status: 'Active',
      can_assign_complaints: false,
      can_resolve_complaints: false,
      can_view_hr_sensitive: false,
      can_evaluate: false,
      can_investigate: false,
      can_approve_resolution: false,
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
      reporting_manager_id: u.reporting_manager_id || '',
      phone: u.phone || '',
      date_of_joining: formattedDoj,
      status: u.status || 'Active',
      can_assign_complaints: u.can_assign_complaints || false,
      can_resolve_complaints: u.can_resolve_complaints || false,
      can_view_hr_sensitive: u.can_view_hr_sensitive || false,
      can_evaluate: u.can_evaluate || false,
      can_investigate: u.can_investigate || false,
      can_approve_resolution: u.can_approve_resolution || false,
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
      if (form.status === 'Active') {
        await inviteMember({
          email: form.email,
          role: form.role,
          department_id: form.department_id || null,
          name: form.name,
          employee_id: form.employee_id || null,
          designation: form.designation || null,
          phone: form.phone || null,
          date_of_joining: form.date_of_joining ? `${form.date_of_joining}T00:00:00Z` : null,
        });
        setSuccessMsg(`Invitation successfully sent to ${form.email}!`);
      } else {
        const randomPassword = Math.random().toString(36).slice(-10) + 'aA1!';
        await createEmployee({ 
          employee_id: form.employee_id || undefined,
          name: form.name, 
          email: form.email, 
          password: randomPassword, 
          role: form.role, 
          department: form.department || undefined,
          department_id: form.department_id || undefined,
          designation: form.designation || undefined,
          reporting_manager_id: form.reporting_manager_id || undefined,
          phone: form.phone || undefined,
          date_of_joining: form.date_of_joining ? `${form.date_of_joining}T00:00:00Z` : undefined,
          status: 'Inactive',
          can_assign_complaints: ['ADMIN', 'ORG_ADMIN', 'HR'].includes(form.role),
          can_resolve_complaints: ['ADMIN', 'ORG_ADMIN', 'HR'].includes(form.role),
          can_view_hr_sensitive: ['ADMIN', 'ORG_ADMIN', 'HR'].includes(form.role),
          can_evaluate: ['ADMIN', 'ORG_ADMIN', 'HR', 'CMD', 'EVALUATOR'].includes(form.role),
          can_investigate: ['ADMIN', 'ORG_ADMIN', 'HR', 'INVESTIGATOR'].includes(form.role),
          can_approve_resolution: ['ADMIN', 'ORG_ADMIN', 'CMD', 'EVALUATOR'].includes(form.role),
        }); 
        setSuccessMsg(`Employee account for ${form.name} created as Inactive.`);
      }
      load(); 
      setTimeout(() => setModal(''), 2000); 
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
        reporting_manager_id: form.reporting_manager_id || undefined,
        phone: form.phone || undefined,
        date_of_joining: form.date_of_joining ? `${form.date_of_joining}T00:00:00Z` : undefined,
        status: form.status,
        password: form.password || undefined,
        can_assign_complaints: form.can_assign_complaints,
        can_resolve_complaints: form.can_resolve_complaints,
        can_view_hr_sensitive: form.can_view_hr_sensitive,
        can_evaluate: form.can_evaluate,
        can_investigate: form.can_investigate,
        can_approve_resolution: form.can_approve_resolution,
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
    let url = '/employees/export';
    const params = [];
    if (deptFilter) params.push(`department=${encodeURIComponent(deptFilter)}`);
    if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
    if (params.length) url += `?${params.join('&')}`;
    
    // Trigger download using the configured api instance to handle cookies
    import('@/lib/api').then(({ default: api }) => {
      api.get(url, { responseType: 'blob' })
        .then(res => {
          const fileUrl = window.URL.createObjectURL(res.data);
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = `employees_export_${new Date().toISOString().slice(0,10)}.csv`;
          a.click();
        })
        .catch(err => alert('Export failed.'));
    });
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
          {depts.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
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

      {/* Create Modal (4-step Wizard) */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(''); }}>
          <div className="modal-box animate-fade-in" style={{ maxWidth: 520, background: '#1c1917', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            {/* Stepper Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>
                  Add New Employee
                </h3>
                <button type="button" className="btn-icon" onClick={() => setModal('')}><X size={16}/></button>
              </div>
              
              {/* Stepper Progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: 2, background: 'rgba(255,255,255,0.08)', zIndex: 1 }} />
                <div style={{ position: 'absolute', left: 0, width: `${((step - 1) / 3) * 100}%`, top: '50%', transform: 'translateY(-50%)', height: 2, background: 'linear-gradient(90deg, var(--purple), var(--purple-light))', transition: 'width 0.3s ease', zIndex: 1 }} />
                
                {[1, 2, 3, 4].map(s => (
                  <div key={s} style={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    background: s < step ? 'var(--purple)' : s === step ? '#1e1b4b' : '#292524',
                    border: s === step ? '2px solid var(--purple)' : '2px solid rgba(255,255,255,0.08)',
                    color: s <= step ? '#fff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    zIndex: 2,
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    boxShadow: s === step ? '0 0 12px rgba(139, 92, 246, 0.4)' : 'none'
                  }}>
                    {s < step ? '✓' : s}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#64748b', padding: '0 2px' }}>
                <span style={{ color: step >= 1 ? '#e2e8f0' : '#64748b', fontWeight: step === 1 ? 500 : 400 }}>1. Basics</span>
                <span style={{ color: step >= 2 ? '#e2e8f0' : '#64748b', fontWeight: step === 2 ? 500 : 400 }}>2. Dept</span>
                <span style={{ color: step >= 3 ? '#e2e8f0' : '#64748b', fontWeight: step === 3 ? 500 : 400 }}>3. Role</span>
                <span style={{ color: step >= 4 ? '#e2e8f0' : '#64748b', fontWeight: step === 4 ? 500 : 400 }}>4. Setup</span>
              </div>
            </div>

            {successMsg ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Check size={24} style={{ color: '#10b981' }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>Success</h3>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleCreate} style={{ padding: 24 }}>
                {/* STEP 1: Basic Details */}
                {step === 1 && (
                  <div className="animate-fade-in">
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 16 }}>
                      Step 1: Enter Employee Personal & ID Details
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Full Name *</label>
                        <input 
                          className="input" 
                          value={form.name} 
                          onChange={e => setForm(f => ({...f, name: e.target.value}))} 
                          placeholder="e.g. Charlie Davis"
                          required
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Email Address *</label>
                        <input 
                          className="input" 
                          type="email"
                          value={form.email} 
                          onChange={e => setForm(f => ({...f, email: e.target.value}))} 
                          placeholder="e.g. charlie@company.com"
                          required
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Employee ID *</label>
                          <input 
                            className="input" 
                            value={form.employee_id} 
                            onChange={e => setForm(f => ({...f, employee_id: e.target.value}))} 
                            placeholder="e.g. EMP003"
                            required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Designation (Optional)</label>
                          <input 
                            className="input" 
                            value={form.designation} 
                            onChange={e => setForm(f => ({...f, designation: e.target.value}))} 
                            placeholder="e.g. HR Recruiter"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Phone Number (Optional)</label>
                          <input 
                            className="input" 
                            value={form.phone} 
                            onChange={e => setForm(f => ({...f, phone: e.target.value}))} 
                            placeholder="e.g. +91 99999 00003"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Date of Joining (Optional)</label>
                          <input 
                            className="input" 
                            type="date"
                            value={form.date_of_joining} 
                            onChange={e => setForm(f => ({...f, date_of_joining: e.target.value}))} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Department */}
                {step === 2 && (
                  <div className="animate-fade-in">
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 16 }}>
                      Step 2: Assign Department
                    </div>
                    
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Department *</label>
                      <select
                        className="select"
                        value={form.department_id}
                        onChange={e => {
                          const selectedId = e.target.value;
                          const selectedDept = depts.find(d => d.id === selectedId);
                          
                          // Dynamic capability mapping suggestion based on department
                          const isHrOrCmd = selectedDept && (selectedDept.type === 'HR' || selectedDept.type === 'CMD');
                          
                          setForm(f => ({
                            ...f,
                            department_id: selectedId,
                            department: selectedDept ? selectedDept.name : '',
                            // Default to EMPLOYEE if non-HR/CMD department, keep current role if HR/CMD
                            role: isHrOrCmd ? f.role : 'EMPLOYEE'
                          }));
                        }}
                        style={{ width: '100%', height: 38 }}
                      >
                        <option value="">Select Department</option>
                        {depts.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                        ))}
                      </select>
                      <p style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                        Assigning the correct department is crucial for routing and compliance access.
                      </p>
                    </div>

                    {form.department && (
                      <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#a78bfa', marginBottom: 4 }}>Department Type:</div>
                        <div style={{ fontSize: 12, color: '#e2e8f0' }}>
                          This is a <strong>{depts.find(d => d.id === form.department_id)?.type || 'NORMAL'}</strong> department. 
                          {depts.find(d => d.id === form.department_id)?.type === 'HR' && " Employees in HR can be granted Handler/Investigator privileges."}
                          {depts.find(d => d.id === form.department_id)?.type === 'CMD' && " Employees in CMD Desk can be granted Handler/Evaluator privileges."}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: System Role */}
                {step === 3 && (() => {
                  const selectedDeptObj = depts.find(d => d.id === form.department_id);
                  const isHrOrCmd = selectedDeptObj && (selectedDeptObj.type === 'HR' || selectedDeptObj.type === 'CMD');
                  
                  return (
                    <div className="animate-fade-in">
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 8 }}>
                        Step 3: Choose Complaint System Role
                      </div>
                      
                      {!isHrOrCmd && (
                        <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: 8, padding: 10, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <div style={{ fontSize: 11, color: '#f3f4f6', lineHeight: 1.4 }}>
                            Typically, employees outside HR/CMD departments are assigned the <strong>Simple Employee</strong> role.
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                        {/* Option 1: Simple Employee */}
                        <div 
                          onClick={() => setForm(f => ({ ...f, role: 'EMPLOYEE' }))}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            border: form.role === 'EMPLOYEE' ? '1px solid var(--purple)' : '1px solid rgba(255,255,255,0.06)',
                            background: form.role === 'EMPLOYEE' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Simple Employee</div>
                            <input type="radio" checked={form.role === 'EMPLOYEE'} readOnly style={{ accentColor: 'var(--purple)' }} />
                          </div>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                            Can submit complaints, view status/history of submitted cases, and leave feedback.
                          </p>
                        </div>

                        {/* Option 2: Handler */}
                        <div 
                          onClick={() => {
                            if (!isHrOrCmd && !window.confirm("This employee is not in HR or CMD. Are you sure you want to assign them Handler privileges?")) return;
                            setForm(f => ({ ...f, role: 'HANDLER' }));
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            border: form.role === 'HANDLER' ? '1px solid var(--purple)' : '1px solid rgba(255,255,255,0.06)',
                            background: form.role === 'HANDLER' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Handler</span>
                              {isHrOrCmd && <span style={{ fontSize: 9, background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', padding: '1px 4px', borderRadius: 4 }}>Recommended</span>}
                            </div>
                            <input type="radio" checked={form.role === 'HANDLER'} readOnly style={{ accentColor: 'var(--purple)' }} />
                          </div>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                            Has access to the Handler Inbox. Routes, categorizes, and assigns incoming cases to investigation teams.
                          </p>
                        </div>

                        {/* Option 3: Investigator */}
                        <div 
                          onClick={() => {
                            if (!isHrOrCmd && !window.confirm("This employee is not in HR or CMD. Are you sure you want to assign them Investigator privileges?")) return;
                            setForm(f => ({ ...f, role: 'INVESTIGATOR' }));
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            border: form.role === 'INVESTIGATOR' ? '1px solid var(--purple)' : '1px solid rgba(255,255,255,0.06)',
                            background: form.role === 'INVESTIGATOR' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Investigator</div>
                            <input type="radio" checked={form.role === 'INVESTIGATOR'} readOnly style={{ accentColor: 'var(--purple)' }} />
                          </div>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                            Works on assigned cases, records evidence, logs investigation steps, and submits recommendations.
                          </p>
                        </div>

                        {/* Option 4: Evaluator */}
                        <div 
                          onClick={() => {
                            if (!isHrOrCmd && !window.confirm("This employee is not in HR or CMD. Are you sure you want to assign them Evaluator privileges?")) return;
                            setForm(f => ({ ...f, role: 'EVALUATOR' }));
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            border: form.role === 'EVALUATOR' ? '1px solid var(--purple)' : '1px solid rgba(255,255,255,0.06)',
                            background: form.role === 'EVALUATOR' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Evaluator</div>
                            <input type="radio" checked={form.role === 'EVALUATOR'} readOnly style={{ accentColor: 'var(--purple)' }} />
                          </div>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                            Reviews completed cases, approves resolutions, oversees SLAs, and handles escalations.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* STEP 4: Setup & Onboarding */}
                {step === 4 && (
                  <div className="animate-fade-in">
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 16 }}>
                      Step 4: Configure Onboarding Status & Save
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                      {/* Active Status */}
                      <div 
                        onClick={() => setForm(f => ({ ...f, status: 'Active' }))}
                        style={{
                          flex: 1,
                          padding: 14,
                          borderRadius: 10,
                          border: form.status === 'Active' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                          background: form.status === 'Active' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255,255,255,0.01)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: form.status === 'Active' ? '#34d399' : '#fff', marginBottom: 4 }}>
                          Active + Send Invite
                        </div>
                        <p style={{ fontSize: 10.5, color: '#94a3b8', margin: 0, lineHeight: 1.3 }}>
                          System generates an invitation and emails setup link to set password.
                        </p>
                      </div>

                      {/* Inactive Status */}
                      <div 
                        onClick={() => setForm(f => ({ ...f, status: 'Inactive' }))}
                        style={{
                          flex: 1,
                          padding: 14,
                          borderRadius: 10,
                          border: form.status === 'Inactive' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.06)',
                          background: form.status === 'Inactive' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255,255,255,0.01)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: form.status === 'Inactive' ? '#f87171' : '#fff', marginBottom: 4 }}>
                          Inactive (Direct Save)
                        </div>
                        <p style={{ fontSize: 10.5, color: '#94a3b8', margin: 0, lineHeight: 1.3 }}>
                          Directly registers user with disabled access. No onboarding email is sent.
                        </p>
                      </div>
                    </div>

                    {/* Summary Preview Box */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 14, fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary Preview</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px 10px', color: '#e2e8f0' }}>
                        <span style={{ color: '#64748b' }}>Name:</span>
                        <strong>{form.name}</strong>
                        
                        <span style={{ color: '#64748b' }}>Email:</span>
                        <span>{form.email}</span>
                        
                        <span style={{ color: '#64748b' }}>Emp ID:</span>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>{form.employee_id}</span>
                        
                        <span style={{ color: '#64748b' }}>Dept:</span>
                        <span>{form.department || '—'} ({form.designation || 'No Designation'})</span>
                        
                        <span style={{ color: '#64748b' }}>Role:</span>
                        <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{form.role}</span>
                        
                        <span style={{ color: '#64748b' }}>Action:</span>
                        <span>
                          {form.status === 'Active' ? (
                            <span style={{ color: '#34d399' }}>✓ Register & Send Invitation Link</span>
                          ) : (
                            <span style={{ color: '#f87171' }}>✗ Register Deactivated Account</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {error && <div className="error-box" style={{ margin: '14px 0 0' }}>{error}</div>}
                
                {/* Wizard Navigation */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {step > 1 && (
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setStep(s => s - 1); setError(''); }} disabled={submitting}>
                      Back
                    </button>
                  )}
                  {step === 1 && (
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal('')}>
                      Cancel
                    </button>
                  )}
                  
                  {step < 4 ? (
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ flex: 2 }}
                      onClick={() => {
                        if (step === 1) {
                          if (!form.name || !form.email || !form.employee_id) {
                            setError('Name, Email, and Employee ID are required.');
                            return;
                          }
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (!emailRegex.test(form.email)) {
                            setError('Please enter a valid email address.');
                            return;
                          }
                          setError('');
                          setStep(2);
                        } else if (step === 2) {
                          if (!form.department_id) {
                            setError('Please select a department.');
                            return;
                          }
                          setError('');
                          setStep(3);
                        } else if (step === 3) {
                          setError('');
                          setStep(4);
                        }
                      }}
                    >
                      Next
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                      {submitting ? 'Processing...' : form.status === 'Active' ? 'Send Invitation' : 'Create Account'}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal (Original Single Screen) */}
      {modal === 'edit' && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(''); }}>
          <div className="modal-box animate-fade-in" style={{ maxWidth: 500 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>
                Edit Employee Details
              </h3>
              <button className="btn-icon" onClick={() => setModal('')}><X size={16}/></button>
            </div>
            
            <form onSubmit={handleEdit}>
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
                    disabled
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                    Password (Leave Blank)
                  </label>
                  <input 
                    className="input" 
                    type="password" 
                    value={form.password} 
                    onChange={e => setForm(f => ({...f, password: e.target.value}))} 
                    placeholder="—"
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
                    <option value="HANDLER">Handler</option>
                    <option value="INVESTIGATOR">Investigator</option>
                    <option value="EVALUATOR">Evaluator</option>
                    <option value="HR">HR Manager</option>
                    <option value="CMD">CMD Manager</option>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Reporting Manager</label>
                  <select
                    className="select"
                    value={form.reporting_manager_id}
                    onChange={e => setForm(f => ({...f, reporting_manager_id: e.target.value}))}
                    style={{ width: '100%', height: 38 }}
                  >
                    <option value="">None</option>
                    {employees.filter(e => e.id !== editUser?.id).map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Phone Number</label>
                  <input 
                    className="input" 
                    value={form.phone} 
                    onChange={e => setForm(f => ({...f, phone: e.target.value}))} 
                    placeholder="e.g. +91 99999 88888"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.can_assign_complaints} 
                      onChange={e => setForm(f => ({...f, can_assign_complaints: e.target.checked}))}
                    />
                    Can assign to handlers
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.can_resolve_complaints} 
                      onChange={e => setForm(f => ({...f, can_resolve_complaints: e.target.checked}))}
                    />
                    Can resolve directly
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.can_view_hr_sensitive} 
                      onChange={e => setForm(f => ({...f, can_view_hr_sensitive: e.target.checked}))}
                    />
                    View sensitive HR cases
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.can_evaluate} 
                      onChange={e => setForm(f => ({...f, can_evaluate: e.target.checked}))}
                    />
                    Evaluator (Triage & Assign)
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.can_investigate} 
                      onChange={e => setForm(f => ({...f, can_investigate: e.target.checked}))}
                    />
                    Investigator (Work on Cases)
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.can_approve_resolution} 
                      onChange={e => setForm(f => ({...f, can_approve_resolution: e.target.checked}))}
                    />
                    Reviewer (Approve Resol.)
                  </label>
                </div>
              </div>

              {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}
              
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal('')}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
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
