'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getOrgSettings, updateOrgSettings, updateOrgProfile, getOrgSetupStatus
} from '@/lib/api';
import {
  Settings, Bell, Brain, Globe, Shield, Database, Clock,
  Eye, EyeOff, Users, Save, Check, AlertTriangle, Loader2
} from 'lucide-react';

// ── Static Config Sections (read-only) ──────────────────────────────────────

const STATIC_SECTIONS = [
  {
    title: 'AI Configuration',
    icon: <Brain size={16}/>,
    color: '#a78bfa',
    items: [
      { label: 'AI Model', value: 'Gemini 1.5 Flash' },
      { label: 'Auto-categorization', value: 'Enabled' },
      { label: 'Priority Scoring', value: 'Enabled' },
      { label: 'Smart Routing', value: 'Enabled' },
      { label: 'Embedding Model', value: 'text-embedding-004' },
    ],
  },
  {
    title: 'Security & Auth',
    icon: <Shield size={16}/>,
    color: '#f87171',
    items: [
      { label: 'JWT Algorithm', value: 'HS256' },
      { label: 'Token Expiry', value: '24 hours' },
      { label: 'Password Hashing', value: 'bcrypt' },
      { label: 'CORS Origins', value: 'localhost:3000' },
    ],
  },
  {
    title: 'Storage & Database',
    icon: <Database size={16}/>,
    color: '#38bdf8',
    items: [
      { label: 'Database', value: 'PostgreSQL + pgvector' },
      { label: 'Cache', value: 'Redis' },
      { label: 'Task Queue', value: 'Celery + Redis' },
      { label: 'File Storage', value: 'Local (Docker volume)' },
    ],
  },
];

// ── Toggle Switch Component ─────────────────────────────────────────────────

function ToggleSwitch({
  enabled, onChange, label, description
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: description ? 4 : 0 }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        style={{
          width: 44, height: 24, borderRadius: 12,
          background: enabled
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'rgba(255,255,255,0.08)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'all 0.2s', flexShrink: 0, marginLeft: 16,
          boxShadow: enabled ? '0 0 12px rgba(16,185,129,0.3)' : 'none',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff',
          position: 'absolute', top: 3,
          left: enabled ? 23 : 3,
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Privacy settings state
  const [privacy, setPrivacy] = useState({
    allow_cmd_view_hr_sensitive: false,
    allow_cmd_view_hr_sensitive_anonymized: true,
    allow_dept_head_view_hr_sensitive: false,
  });
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyDirty, setPrivacyDirty] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState(false);
  const [error, setError] = useState('');

  // Operating hours state
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('18:00');
  const [workingDays, setWorkingDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState(false);
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'ORG_ADMIN' && user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    loadSettings();
  }, [user, authLoading]);

  const loadSettings = async () => {
    try {
      const [settingsRes] = await Promise.all([
        getOrgSettings().catch(() => ({ data: null })),
      ]);

      if (settingsRes.data) {
        setPrivacy({
          allow_cmd_view_hr_sensitive: settingsRes.data.allow_cmd_view_hr_sensitive ?? false,
          allow_cmd_view_hr_sensitive_anonymized: settingsRes.data.allow_cmd_view_hr_sensitive_anonymized ?? true,
          allow_dept_head_view_hr_sensitive: settingsRes.data.allow_dept_head_view_hr_sensitive ?? false,
        });
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handlePrivacyChange = (key: keyof typeof privacy, value: boolean) => {
    setPrivacy(prev => {
      const next = { ...prev, [key]: value };
      // If allowing full CMD access, disable anonymized (they get full access anyway)
      if (key === 'allow_cmd_view_hr_sensitive' && value) {
        next.allow_cmd_view_hr_sensitive_anonymized = false;
      }
      return next;
    });
    setPrivacyDirty(true);
    setPrivacySuccess(false);
  };

  const savePrivacy = async () => {
    setPrivacySaving(true);
    setError('');
    try {
      await updateOrgSettings(privacy);
      setPrivacyDirty(false);
      setPrivacySuccess(true);
      setTimeout(() => setPrivacySuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save privacy settings.');
    } finally {
      setPrivacySaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const saveHours = async () => {
    setHoursSaving(true);
    setError('');
    const working_hours: Record<string, { start: string; end: string }> = {};
    workingDays.forEach(day => {
      working_hours[day] = { start: startHour, end: endHour };
    });
    try {
      await updateOrgProfile({
        name: orgName || user?.name || 'Organization',
        timezone,
        working_hours,
      });
      setHoursSuccess(true);
      setTimeout(() => setHoursSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save working hours.');
    } finally {
      setHoursSaving(false);
    }
  };

  if (authLoading || privacyLoading) {
    return (
      <DashboardLayout title="Settings">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#fbbf24' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings">
      <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#f87171',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* ── Privacy & Sharing ────────────────────────────────────────── */}
        <div className="glass" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(245,158,11,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fbbf24',
              }}>
                <Eye size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                  Privacy & Sharing Rules
                </h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0, marginTop: 2 }}>
                  Control who can see HR-sensitive complaints
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={savePrivacy}
              disabled={!privacyDirty || privacySaving}
              style={{
                padding: '8px 18px', fontSize: 12,
                opacity: privacyDirty ? 1 : 0.5,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {privacySaving ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : privacySuccess ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {privacySaving ? 'Saving...' : privacySuccess ? 'Saved!' : 'Save'}
            </button>
          </div>

          <ToggleSwitch
            enabled={privacy.allow_cmd_view_hr_sensitive}
            onChange={v => handlePrivacyChange('allow_cmd_view_hr_sensitive', v)}
            label="Allow CMD to view HR-sensitive complaints"
            description="CMD desk handlers will have full access to HR-sensitive complaint details including employee identity."
          />
          <ToggleSwitch
            enabled={privacy.allow_cmd_view_hr_sensitive_anonymized}
            onChange={v => handlePrivacyChange('allow_cmd_view_hr_sensitive_anonymized', v)}
            label="Allow CMD to view HR-sensitive (anonymized)"
            description="CMD desk handlers can see anonymized versions of HR-sensitive complaints with employee details redacted."
          />
          <ToggleSwitch
            enabled={privacy.allow_dept_head_view_hr_sensitive}
            onChange={v => handlePrivacyChange('allow_dept_head_view_hr_sensitive', v)}
            label="Allow Department Heads to view HR-sensitive"
            description="Department heads can view HR-sensitive complaints routed to their department."
          />

          {privacySuccess && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              fontSize: 12, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Check size={14} /> Privacy settings updated successfully.
            </div>
          )}
        </div>

        {/* ── Operating Hours ─────────────────────────────────────────── */}
        <div className="glass" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(56,189,248,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#38bdf8',
              }}>
                <Clock size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                  Operating Hours & Timezone
                </h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0, marginTop: 2 }}>
                  Used for SLA calculations and business-hour workflows
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={saveHours}
              disabled={hoursSaving}
              style={{ padding: '8px 18px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {hoursSaving ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : hoursSuccess ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {hoursSaving ? 'Saving...' : hoursSuccess ? 'Saved!' : 'Save Hours'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Timezone</label>
              <select className="input" value={timezone} onChange={e => setTimezone(e.target.value)} style={{ appearance: 'none' }}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Shift Start</label>
              <input className="input" type="time" value={startHour} onChange={e => setStartHour(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Shift End</label>
              <input className="input" type="time" value={endHour} onChange={e => setEndHour(e.target.value)} />
            </div>
          </div>

          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Working Days</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
              const active = workingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: active ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.02)',
                    color: active ? '#38bdf8' : '#64748b',
                    border: `1px solid ${active ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                  }}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>

          {hoursSuccess && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              fontSize: 12, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Check size={14} /> Operating hours updated. New SLA calculations will use these settings.
            </div>
          )}
        </div>

        {/* ── Static Config Sections (read-only) ─────────────────────── */}
        <div className="info-box" style={{ marginTop: 4 }}>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            The following sections are configured via environment variables and cannot be changed from the UI.
          </p>
        </div>

        {STATIC_SECTIONS.map(section => (
          <div key={section.title} className="glass" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${section.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: section.color,
              }}>
                {section.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{section.title}</h3>
            </div>
            {section.items.map((item, i) => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0',
                borderBottom: i < section.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{item.label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 500, color: '#e2e8f0',
                  background: 'rgba(255,255,255,0.04)', padding: '3px 10px',
                  borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)',
                }}>{item.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
