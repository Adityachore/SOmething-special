'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Shield, Eye, EyeOff, Zap } from 'lucide-react';

import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  const quickLogin = (role: string) => {
    const map: Record<string, [string, string]> = {
      admin:    ['admin@demo.com',    'Admin@1234'],
      hr:       ['hr@demo.com',       'Hr@1234'],
      cmd:      ['cmd@demo.com',      'Cmd@1234'],
      employee: ['employee@demo.com', 'Emp@1234'],
    };
    setEmail(map[role][0]); setPassword(map[role][1]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Invalid email or password. Try a quick login below.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 440 }} className="animate-fade-in">
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
              background: 'linear-gradient(135deg,#fbbf24,#d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(245,158,11,0.3)'
            }}>
              <Shield size={28} color="white" />
            </div>
            <h1 className="gradient-text" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>AI Complaint Analyzer</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Intelligent complaint management platform</p>
          </div>

          {/* Card */}
          <div className="glass" style={{ padding: 32 }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Email address</label>
                <input
                  className="input" type="email" placeholder="you@company.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>Password</label>
                  <a href="/login/forgot" style={{ fontSize: 12, color: '#fbbf24', textDecoration: 'none' }}>Forgot password?</a>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>
                  {error}
                </div>
              )}

              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15 }}>
                {loading ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/> : 'Sign In'}
              </button>
            </form>

            {/* Quick logins */}
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}/>
                <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}><Zap size={12}/>Quick Demo Login</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { role: 'admin', label: 'Admin', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                  { role: 'hr', label: 'HR Manager', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                  { role: 'cmd', label: 'CMD', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
                  { role: 'employee', label: 'Employee', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
                ].map(({ role, label, color, bg }) => (
                  <button key={role} onClick={() => quickLogin(role)}
                    style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${color}33`, background: bg, color, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity='0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity='1')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              New organization?{' '}
              <a href="/signup" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 500 }}>
                Create Organization
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
