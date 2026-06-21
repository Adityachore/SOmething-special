'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signupOrg } from '@/lib/api';
import { Shield, Building, User, Mail, Lock } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await signupOrg({
        name,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
      });

      // Cookies are handled by the backend
      // Redirect to the organization setup wizard
      window.location.href = '/org-setup';
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to sign up organization. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 460 }} className="animate-fade-in">
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #fbbf24, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(245,158,11,0.3)'
            }}>
              <Shield size={28} color="white" />
            </div>
            <h1 className="gradient-text" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Create Organization</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Register your business tenant to start managing complaints</p>
          </div>

          {/* Card */}
          <div className="glass" style={{ padding: 32 }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                  <Building size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                  Organization / Company Name
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="Acme Corporation"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                  <User size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                  Administrator Name
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="John Doe"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                  <Mail size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                  Administrator Email Address
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="admin@company.com"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                  <Lock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                  Administrator Password
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#f87171'
                }}>
                  {error}
                </div>
              )}

              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15 }}>
                {loading ? (
                  <div style={{
                    width: 18, height: 18,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite'
                  }} />
                ) : 'Sign Up Organization'}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 500 }}>
                Sign In
              </a>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#334155' }}>
            Powered by Gemini AI · Multi-tenant · SOC2 Ready
          </p>
        </div>
      </div>
    </div>
  );
}
