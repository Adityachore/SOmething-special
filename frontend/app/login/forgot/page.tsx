'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { forgotPassword, resetPassword } from '@/lib/api';
import { Shield, ArrowLeft, Key, Lock, Eye, EyeOff } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devToken, setDevToken] = useState('');

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const res = await forgotPassword(email);
      setSuccessMsg('A reset token has been generated. Since this is a dev/test environment, the token is shown below.');
      if (res.data?.reset_token) {
        setDevToken(res.data.reset_token);
        setToken(res.data.reset_token); // Auto-fill for convenience
      }
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to request reset token. Make sure the email is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setError('Password cannot be empty.');
      return;
    }
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      await resetPassword({ token, new_password: newPassword });
      setSuccessMsg('Your password has been reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password. The token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="gradient-text" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Reset Password</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Recover access to your account</p>
          </div>

          {/* Card */}
          <div className="glass" style={{ padding: 32 }}>
            <button className="btn btn-secondary" onClick={() => step === 2 ? setStep(1) : router.push('/login')} style={{ marginBottom: 20, fontSize: 12, padding: '6px 12px' }}>
              <ArrowLeft size={12}/> Back
            </button>

            {successMsg && (
              <div className="success-box" style={{ marginBottom: 16 }}>
                {successMsg}
              </div>
            )}

            {devToken && step === 2 && (
              <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px dashed rgba(251,191,36,0.4)', borderRadius: 10, padding: 12, marginBottom: 20, wordBreak: 'break-all' }}>
                <span style={{ display: 'block', fontSize: 11, color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Development Reset Token</span>
                <code style={{ fontSize: 12, color: '#fde047', fontFamily: 'monospace' }}>{devToken}</code>
              </div>
            )}

            {error && (
              <div className="error-box" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleRequestToken}>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 20 }}>
                  Enter your email address and we'll check our records to generate a password reset token.
                </p>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Email address</label>
                  <input
                    className="input" type="email" placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)} required
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15 }}>
                  {loading ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/> : 'Request Reset Token'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Reset Token</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input" type="text" placeholder="Paste reset token here"
                      value={token} onChange={e => setToken(e.target.value)} required
                      style={{ paddingLeft: 40 }}
                    />
                    <Key size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}/>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                      style={{ paddingLeft: 40, paddingRight: 44 }}
                    />
                    <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}/>
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 15 }}>
                  {loading ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/> : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
