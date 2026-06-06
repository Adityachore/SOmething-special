'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  getOrgSetupStatus,
  updateOrgProfile,
  getDepartments,
  createDepartment,
  setupKeyRoles
} from '@/lib/api';
import {
  Shield, Building, Clock, Users, ArrowRight, ArrowLeft, Check,
  Plus, Mail, Briefcase, Trash
} from 'lucide-react';

export default function OrgSetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1: Company Profile States
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('18:00');
  const [workingDays, setWorkingDays] = useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

  // Step 2: Departments States
  const [departments, setDepartments] = useState<any[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptType, setNewDeptType] = useState<'HR' | 'CMD' | 'NORMAL'>('NORMAL');

  // Step 3: Key Roles States
  const [hrEmail, setHrEmail] = useState('');
  const [cmdEmail, setCmdEmail] = useState('');
  const [invitations, setInvitations] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'ORG_ADMIN' && user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    // Set initial company name from current user profile
    setCompanyName(user.name || '');
    
    // Fetch departments and check setup status
    fetchStatusAndDepts();
  }, [user, authLoading]);

  const fetchStatusAndDepts = async () => {
    try {
      const [statusRes, deptRes] = await Promise.all([
        getOrgSetupStatus().catch(() => ({ data: null })),
        getDepartments().catch(() => ({ data: [] }))
      ]);

      if (deptRes.data) {
        setDepartments(deptRes.data);
      }
      
      if (statusRes.data) {
        const { profile_completed, departments_configured, key_roles_configured } = statusRes.data;
        
        // If setup is fully completed, redirect to admin immediately
        if (profile_completed && departments_configured && key_roles_configured) {
          setSuccessMsg('Organization is already fully set up. Redirecting...');
          setTimeout(() => {
            router.push('/admin');
          }, 1500);
          return;
        }

        // Restore active step based on progress
        if (profile_completed && departments_configured) {
          setStep(3);
        } else if (profile_completed) {
          setStep(2);
        }
      }
    } catch (err) {
      console.error('Failed to check setup status', err);
    }
  };

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Build working hours JSON
    const working_hours: Record<string, { start: string; end: string }> = {};
    workingDays.forEach(day => {
      working_hours[day] = { start: startHour, end: endHour };
    });

    try {
      await updateOrgProfile({
        name: companyName,
        timezone,
        working_hours,
        industry,
        website,
        address,
        logo_url: null
      });
      
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update company profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await createDepartment({
        name: newDeptName,
        type: newDeptType
      });
      setDepartments([...departments, data]);
      setNewDeptName('');
      setNewDeptType('NORMAL');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create department. Duplicate name?');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Next = () => {
    // Verify we have at least one HR and one CMD department
    const hasHR = departments.some(d => d.type === 'HR');
    const hasCMD = departments.some(d => d.type === 'CMD');
    
    if (!hasHR || !hasCMD) {
      setError('You must have at least one Human Resources (HR) and one CMD Desk (CMD) department configured.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const hrDept = departments.find(d => d.type === 'HR');
    const cmdDept = departments.find(d => d.type === 'CMD');

    if (!hrDept || !cmdDept) {
      setError('HR and CMD departments not found. Please go back and ensure they exist.');
      setLoading(false);
      return;
    }

    try {
      const { data } = await setupKeyRoles({
        hr_head: { email: hrEmail, department_id: hrDept.id },
        cmd_head: { email: cmdEmail, department_id: cmdDept.id }
      });

      setInvitations(data);
      setSuccessMsg('Key role invitations sent successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to setup key roles. Verify emails are valid.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', width: '100%' }}>
        
        {/* Step Indicators */}
        <div style={{ width: '100%', maxWidth: 700, display: 'flex', justifyContent: 'space-between', marginBottom: 40, position: 'relative' }}>
          {/* Horizontal bar line */}
          <div style={{ position: 'absolute', top: 18, left: '5%', right: '5%', height: 2, background: 'rgba(255,255,255,0.06)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 18, left: '5%', width: step === 1 ? '0%' : step === 2 ? '50%' : '100%', height: 2, background: '#fbbf24', zIndex: 0, transition: 'all 0.3s' }} />

          {[
            { num: 1, label: 'Profile', icon: <Building size={16} /> },
            { num: 2, label: 'Departments', icon: <Users size={16} /> },
            { num: 3, label: 'Key Roles', icon: <Clock size={16} /> }
          ].map(s => (
            <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, cursor: s.num < step ? 'pointer' : 'default' }} onClick={() => s.num < step && setStep(s.num)}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: step === s.num ? 'linear-gradient(135deg, #fbbf24, #d97706)' : step > s.num ? '#10b981' : '#1e293b',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: step === s.num ? '0 0 15px rgba(245,158,11,0.4)' : 'none',
                border: '2px solid rgba(255,255,255,0.05)', transition: 'all 0.3s'
              }}>
                {step > s.num ? <Check size={16} /> : s.icon}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, marginTop: 8, color: step >= s.num ? '#e2e8f0' : '#475569' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: 700 }}>
          {/* Wizard Main Card */}
          <div className="glass" style={{ padding: 40, width: '100%' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(245,158,11,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Shield size={16} style={{ color: '#fbbf24' }} />
              </div>
              <h2 className="gradient-text" style={{ fontSize: 22, fontWeight: 700 }}>Organization Setup Wizard</h2>
            </div>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 32 }}>
              Complete these essential steps to configure your tenant and launch.
            </p>

            {successMsg && (
              <div style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 24,
                fontSize: 14,
                color: '#34d399'
              }}>
                {successMsg}
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 24,
                fontSize: 14,
                color: '#f87171'
              }}>
                {error}
              </div>
            )}

            {/* STEP 1: Company Profile */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="animate-fade-in">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Company Name</label>
                    <input className="input" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Timezone</label>
                    <select className="input" value={timezone} onChange={e => setTimezone(e.target.value)} style={{ appearance: 'none' }}>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Industry</label>
                    <input className="input" type="text" placeholder="e.g. Technology, Finance, Health" value={industry} onChange={e => setIndustry(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Website</label>
                    <input className="input" type="url" placeholder="https://company.com" value={website} onChange={e => setWebsite(e.target.value)} />
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Office Address</label>
                  <textarea className="input" placeholder="Enter complete office address" value={address} onChange={e => setAddress(e.target.value)} rows={3} style={{ resize: 'none', height: 'auto' }} />
                </div>

                {/* Working Hours */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, marginBottom: 30 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Clock size={15} style={{ color: '#fbbf24' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Operating Working Hours</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Shift Start Time</label>
                      <input className="input" type="time" value={startHour} onChange={e => setStartHour(e.target.value)} required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Shift End Time</label>
                      <input className="input" type="time" value={endHour} onChange={e => setEndHour(e.target.value)} required />
                    </div>
                  </div>

                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8 }}>Select Working Days</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                      const active = workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 500,
                            background: active ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.02)',
                            color: active ? '#fbbf24' : '#64748b',
                            border: `1px solid ${active ? '#fbbf24' : 'rgba(255,255,255,0.05)'}`,
                            cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s'
                          }}>
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Next: Configure Departments'}
                    <ArrowRight size={16} style={{ marginLeft: 8 }} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Departments Configuration */}
            {step === 2 && (
              <div className="animate-fade-in">
                {/* Existing departments list */}
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Configured Departments</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {departments.map((dept: any) => (
                    <div key={dept.id} style={{
                      padding: '12px 16px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{dept.name}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Type: {dept.type}</div>
                      </div>
                      {dept.type !== 'NORMAL' && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: '#fbbf24',
                          background: 'rgba(251,191,36,0.1)', padding: '2px 6px', borderRadius: 6
                        }}>
                          Autocreated
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Custom Department form */}
                <form onSubmit={handleAddDepartment} style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, marginBottom: 30 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <Plus size={14} style={{ color: '#fbbf24' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Add Additional Department</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 12, marginBottom: 14 }}>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Engineering Support, Finance, IT"
                      value={newDeptName}
                      onChange={e => setNewDeptName(e.target.value)}
                    />
                    <select
                      className="input"
                      value={newDeptType}
                      onChange={e => setNewDeptType(e.target.value as any)}
                      style={{ appearance: 'none' }}>
                      <option value="NORMAL">NORMAL</option>
                      <option value="HR">HR</option>
                      <option value="CMD">CMD</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '6px 14px', fontSize: 12 }}>
                      Add Department
                    </button>
                  </div>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button type="button" className="btn" onClick={() => setStep(1)} style={{ background: 'rgba(255,255,255,0.02)', color: '#94a3b8' }}>
                    <ArrowLeft size={16} style={{ marginRight: 8 }} />
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleStep2Next}>
                    Next: Key Roles
                    <ArrowRight size={16} style={{ marginLeft: 8 }} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Key Roles Setup */}
            {step === 3 && (
              <div className="animate-fade-in">
                {!invitations ? (
                  <form onSubmit={handleStep3Submit}>
                    <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
                      Provide email addresses to invite the heads of your <strong>Human Resources (HR)</strong> and <strong>CMD Desk</strong> departments. They will receive secure registration tokens.
                    </p>

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                        <Mail size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                        HR Manager / Head Email Address
                      </label>
                      <input
                        className="input"
                        type="email"
                        placeholder="hr.head@company.com"
                        value={hrEmail}
                        onChange={e => setHrEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ marginBottom: 30 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                        <Mail size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                        CMD Desk Head Email Address
                      </label>
                      <input
                        className="input"
                        type="email"
                        placeholder="cmd.head@company.com"
                        value={cmdEmail}
                        onChange={e => setCmdEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button type="button" className="btn" onClick={() => setStep(2)} style={{ background: 'rgba(255,255,255,0.02)', color: '#94a3b8' }}>
                        <ArrowLeft size={16} style={{ marginRight: 8 }} />
                        Back
                      </button>
                      <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Invite Heads & Complete Setup'}
                        <Check size={16} style={{ marginLeft: 8 }} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div style={{
                      background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 14, padding: 24, marginBottom: 24, textAlign: 'center'
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', background: 'rgba(16,185,129,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
                      }}>
                        <Check size={20} style={{ color: '#10b981' }} />
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>Invitations Generated</h3>
                      <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                        Copy these invitation links to onboard the HR Head and CMD Desk Head.
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 30 }}>
                      {[
                        { role: 'HR Head', email: invitations.hr_head_invitation.email, link: invitations.hr_head_invitation.link, token: invitations.hr_head_invitation.token },
                        { role: 'CMD Head', email: invitations.cmd_head_invitation.email, link: invitations.cmd_head_invitation.link, token: invitations.cmd_head_invitation.token }
                      ].map(inv => (
                        <div key={inv.role} style={{
                          padding: 18, borderRadius: 12,
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{inv.role}</span>
                            <span style={{ fontSize: 11, color: '#475569' }}>{inv.email}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                            <input
                              className="input"
                              readOnly
                              value={`${window.location.origin}${inv.link}`}
                              style={{ fontSize: 11, padding: '6px 12px', background: 'rgba(0,0,0,0.2)', color: '#fbbf24' }}
                            />
                            <button
                              className="btn"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}${inv.link}`);
                                alert('Link copied to clipboard!');
                              }}
                              style={{ padding: '6px 12px', fontSize: 11 }}>
                              Copy
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button className="btn btn-primary" onClick={() => router.push('/admin')}>
                        Go to Admin Dashboard
                        <ArrowRight size={16} style={{ marginLeft: 8 }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
