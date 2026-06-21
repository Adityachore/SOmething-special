'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { acceptInvitation } from '@/lib/api';
import { Shield, Lock, Eye, EyeOff, UserCheck } from 'lucide-react';

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in the URL. Please verify your invitation link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const { data } = await acceptInvitation({
        token,
        password
      });

      setSuccess(true);
      
      // Cookies are handled by the backend

      // Redirect to home page (which routes based on user role)
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to accept invitation. The link may have expired or already been used.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 440 }} className="animate-fade-in">
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #fbbf24, #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(245,158,11,0.3)'
        }}>
          <UserCheck size={28} color="white" />
        </div>
        <h1 className="gradient-text" style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Accept Invitation</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Configure your account credentials to join the organization</p>
      </div>

      {/* Card */}
      <div className="glass" style={{ padding: 32 }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <UserCheck size={20} style={{ color: '#10b981' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>Account Activated!</h3>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Logging you in and redirecting to your workspace...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                <Lock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                Create Password (min 8 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={!token}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  disabled={!token}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'
                  }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
                <Lock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                Confirm Password
              </label>
              <input
                className="input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={!token}
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

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || !token}
              style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15 }}>
              {loading ? (
                <div style={{
                  width: 18, height: 18,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite'
                }} />
              ) : 'Activate Account & Sign In'}
            </button>
          </form>
        )}
      </div>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#334155' }}>
        Powered by Gemini AI · Multi-tenant · SOC2 Ready
      </p>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, width: '100%' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="spinner" />
          </div>
        }>
          <AcceptInvitationForm />
        </Suspense>
      </div>
    </div>
  );
}
