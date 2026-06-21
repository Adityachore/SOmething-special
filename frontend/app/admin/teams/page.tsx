'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getTeams, createTeam, updateTeam, deleteTeam,
  addTeamMember, removeTeamMember, getEmployees, getTeam
} from '@/lib/api';
import {
  Users, Shield, Plus, Trash2, Edit3, UserPlus, X, Loader2, AlertCircle, CheckCircle2, Crown, User
} from 'lucide-react';

const TEAM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  POSH: { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
  ETHICS: { bg: 'rgba(167,139,250,0.1)', text: '#c084fc', border: 'rgba(167,139,250,0.2)' },
  HR_INVESTIGATION: { bg: 'rgba(56,189,248,0.1)', text: '#38bdf8', border: 'rgba(56,189,248,0.2)' },
  CMD_REVIEW: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8', border: 'rgba(99,102,241,0.2)' },
  CUSTOM: { bg: 'rgba(110,231,183,0.1)', text: '#34d399', border: 'rgba(110,231,183,0.2)' },
};

export default function TeamsDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [teams, setTeams] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [modal, setModal] = useState<'create' | 'edit' | 'members' | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Form states
  const [teamForm, setTeamForm] = useState({ name: '', type: 'CUSTOM', status: 'ACTIVE' });
  const [memberForm, setMemberForm] = useState({ user_id: '', role_in_team: 'MEMBER' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'ORG_ADMIN' && user.role !== 'ADMIN' && user.role !== 'HR') {
      router.push('/');
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [teamsRes, employeesRes] = await Promise.all([
        getTeams(),
        getEmployees({ page_size: 500 }), // Load active users
      ]);
      setTeams(teamsRes.data || []);
      setEmployees(employeesRes.data?.items || employeesRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teams data.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Team CRUD Handlers ──────────────────────────────────────────────────────

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createTeam({ name: teamForm.name, type: teamForm.type });
      showSuccess(`Team "${teamForm.name}" created successfully.`);
      setTeamForm({ name: '', type: 'CUSTOM', status: 'ACTIVE' });
      setModal(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to create team.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !teamForm.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateTeam(selectedTeam.id, {
        name: teamForm.name,
        type: teamForm.type,
        status: teamForm.status
      });
      showSuccess('Team updated successfully.');
      setModal(null);
      setSelectedTeam(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to update team.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    setError('');
    try {
      await deleteTeam(teamId);
      showSuccess('Team deleted successfully.');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to delete team.');
    }
  };

  // ── Team Member Handlers ────────────────────────────────────────────────────

  const loadTeamMembers = async (teamId: string) => {
    setLoadingMembers(true);
    try {
      const res = await getTeam(teamId);
      setMembersList(res.data?.members || []);
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !memberForm.user_id) return;
    setSaving(true);
    setError('');
    try {
      await addTeamMember(selectedTeam.id, {
        user_id: memberForm.user_id,
        role_in_team: memberForm.role_in_team
      });
      showSuccess('Member added to team.');
      setMemberForm(prev => ({ ...prev, user_id: '' }));
      await loadTeamMembers(selectedTeam.id);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to add member.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;
    if (!confirm('Remove this member from the team?')) return;
    setError('');
    try {
      await removeTeamMember(selectedTeam.id, userId);
      showSuccess('Member removed from team.');
      await loadTeamMembers(selectedTeam.id);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to remove member.');
    }
  };

  // Helpers
  const openMembersModal = (team: any) => {
    setSelectedTeam(team);
    setMembersList([]);
    setMemberForm({ user_id: '', role_in_team: 'MEMBER' });
    setModal('members');
    loadTeamMembers(team.id);
  };

  const openEditModal = (team: any) => {
    setSelectedTeam(team);
    setTeamForm({ name: team.name, type: team.type, status: team.status });
    setModal('edit');
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Teams & Committees">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#fbbf24' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Teams & Committees">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Header section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Operational Teams</h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0, marginTop: 4 }}>
              Define specialized grievance bodies, compliance panels, and investigator committees.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setTeamForm({ name: '', type: 'CUSTOM', status: 'ACTIVE' });
              setModal('create');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '10px 16px' }}
          >
            <Plus size={15} /> Create Team
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#f87171',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#34d399',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        {/* Teams List Grid */}
        {teams.length === 0 ? (
          <div className="glass" style={{ padding: 48, textAlign: 'center', borderRadius: 12 }}>
            <Shield size={40} style={{ color: '#475569', marginBottom: 12, display: 'inline-block' }} />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>No teams defined yet</h3>
            <p style={{ fontSize: 12, color: '#64748b', maxWidth: 360, margin: '0 auto 16px' }}>
              Specialized investigation groups are required to route and process complaints. Create your first operational team.
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => setModal('create')}
              style={{ fontSize: 12, padding: '8px 16px' }}
            >
              + Create Committee
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {teams.map(team => {
              const colors = TEAM_COLORS[team.type] || TEAM_COLORS.CUSTOM;
              const isActive = team.status === 'ACTIVE';
              return (
                <div key={team.id} className="glass" style={{
                  padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        padding: '3px 8px', borderRadius: 6, background: colors.bg, color: colors.text,
                        border: `1px solid ${colors.border}`
                      }}>
                        {team.type.replace('_', ' ')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: isActive ? '#10b981' : '#64748b'
                        }} />
                        <span style={{ fontSize: 10, color: isActive ? '#34d399' : '#64748b', fontWeight: 600 }}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px 0' }}>{team.name}</h3>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 14 }}>
                    <button
                      onClick={() => openMembersModal(team)}
                      style={{
                        background: 'none', border: 'none', color: '#fbbf24', fontSize: 12,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0
                      }}
                    >
                      <Users size={14} /> Configure Members
                    </button>
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => openEditModal(team)}
                        style={{
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#94a3b8', cursor: 'pointer'
                        }}
                        title="Edit Details"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        style={{
                          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
                          borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#f87171', cursor: 'pointer'
                        }}
                        title="Delete Team"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CREATE / EDIT TEAM MODAL ────────────────────────────────────────── */}
        {(modal === 'create' || modal === 'edit') && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(7,7,9,0.7)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div className="glass animate-in fade-in zoom-in-95" style={{
              width: '100%', maxWidth: 440, padding: 28, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                  {modal === 'create' ? 'Create Team / Committee' : 'Edit Team Settings'}
                </h3>
                <button
                  onClick={() => setModal(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={modal === 'create' ? handleCreateTeam : handleEditTeam} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Team Name</label>
                  <input
                    className="input"
                    type="text"
                    required
                    placeholder="e.g. POSH Investigation Committee"
                    value={teamForm.name}
                    onChange={e => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Committee Type</label>
                  <select
                    className="input"
                    value={teamForm.type}
                    onChange={e => setTeamForm(prev => ({ ...prev, type: e.target.value }))}
                    style={{ appearance: 'none' }}
                  >
                    <option value="POSH">POSH Committee (Harassment cases)</option>
                    <option value="ETHICS">Ethics Committee (Fraud, Conduct)</option>
                    <option value="HR_INVESTIGATION">HR Investigation (Grievances, Performance)</option>
                    <option value="CMD_REVIEW">CMD Oversight Board</option>
                    <option value="CUSTOM">Custom Group</option>
                  </select>
                </div>

                {modal === 'edit' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Status</label>
                    <select
                      className="input"
                      value={teamForm.status}
                      onChange={e => setTeamForm(prev => ({ ...prev, status: e.target.value }))}
                      style={{ appearance: 'none' }}
                    >
                      <option value="ACTIVE">Active (Available for routing)</option>
                      <option value="INACTIVE">Inactive (Hidden from routing)</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {modal === 'create' ? 'Create Team' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── CONFIGURE MEMBERS MODAL ─────────────────────────────────────────── */}
        {modal === 'members' && selectedTeam && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(7,7,9,0.7)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div className="glass" style={{
              width: '100%', maxWidth: 600, padding: 28, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column'
            }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexShrink: 0 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                    Members: {selectedTeam.name}
                  </h3>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, marginTop: 2 }}>
                    Manage authorized personnel for this operational group.
                  </p>
                </div>
                <button
                  onClick={() => setModal(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', margin: '20px 0', paddingRight: 4 }}>
                
                {/* Roster list */}
                <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 10, marginTop: 0 }}>Current Roster</h4>
                
                {loadingMembers ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#fbbf24' }} />
                  </div>
                ) : membersList.length === 0 ? (
                  <div style={{
                    padding: 24, textAlign: 'center', background: 'rgba(255,255,255,0.01)',
                    border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 10, color: '#475569', fontSize: 12
                  }}>
                    No members enrolled in this team yet. Use the form below to add members.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    {membersList.map(member => {
                      const isLead = member.role_in_team === 'LEAD';
                      const isExternal = member.role_in_team === 'EXTERNAL';
                      return (
                        <div key={member.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: 8
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
                            }}>
                              <User size={14} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {member.user?.name || 'Unknown User'}
                                {isLead && (
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, color: '#fbbf24', background: 'rgba(245,158,11,0.1)',
                                    padding: '1px 5px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2
                                  }}>
                                    <Crown size={8} /> LEAD
                                  </span>
                                )}
                                {isExternal && (
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.1)',
                                    padding: '1px 5px', borderRadius: 4
                                  }}>
                                    EXTERNAL
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{member.user?.email || ''}</div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            style={{
                              background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                              padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            className="hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add member form */}
                <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 12, borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 18 }}>
                  Enroll Member
                </h4>
                
                <form onSubmit={handleAddMember} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 500, color: '#64748b', marginBottom: 5 }}>Select Employee</label>
                    <select
                      className="input"
                      required
                      value={memberForm.user_id}
                      onChange={e => setMemberForm(prev => ({ ...prev, user_id: e.target.value }))}
                      style={{ appearance: 'none' }}
                    >
                      <option value="">Choose user...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 500, color: '#64748b', marginBottom: 5 }}>Role in Team</label>
                    <select
                      className="input"
                      value={memberForm.role_in_team}
                      onChange={e => setMemberForm(prev => ({ ...prev, role_in_team: e.target.value }))}
                      style={{ appearance: 'none' }}
                    >
                      <option value="MEMBER">Member</option>
                      <option value="LEAD">Lead</option>
                      <option value="EXTERNAL">External</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || !memberForm.user_id}
                    style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 0 }}
                  >
                    <UserPlus size={14} /> Add
                  </button>
                </form>

              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
