'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Shield, Eye, EyeOff, Zap, Mail, Lock, Bot, Sparkles, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Invalid email or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#050a18' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .login-page {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #050a18;
        }

        /* ─── Left Panel ─── */
        .login-left {
          width: 480px;
          min-width: 420px;
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 52px;
          background: #0a0e1a;
          border-right: 1px solid rgba(59, 130, 246, 0.08);
          position: relative;
          z-index: 2;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #06b6d4, #10b981);
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 10px;
        }

        .login-logo-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
          position: relative;
        }

        .login-logo-icon::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          z-index: -1;
          opacity: 0.4;
          filter: blur(8px);
        }

        .login-logo-text {
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #60a5fa, #38bdf8, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .login-subtitle {
          font-size: 15px;
          font-weight: 500;
          color: #94a3b8;
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }

        .login-tagline {
          font-size: 13px;
          color: #475569;
          margin-bottom: 40px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .login-tagline span {
          color: #3b82f6;
        }

        /* Form Fields */
        .login-field {
          margin-bottom: 22px;
          position: relative;
        }

        .login-field label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .login-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;
          left: 14px;
          color: #475569;
          z-index: 1;
          pointer-events: none;
          transition: color 0.2s;
        }

        .login-input {
          width: 100%;
          padding: 12px 14px 12px 44px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(59, 130, 246, 0.12);
          border-radius: 12px;
          color: #e2e8f0;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .login-input:focus {
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08), 0 4px 16px rgba(59, 130, 246, 0.1);
          background: rgba(15, 23, 42, 1);
        }

        .login-input:focus ~ .login-input-icon,
        .login-input-wrap:focus-within .login-input-icon {
          color: #3b82f6;
        }

        .login-input::placeholder {
          color: #334155;
        }

        .login-pass-toggle {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
          z-index: 1;
        }

        .login-pass-toggle:hover {
          color: #94a3b8;
        }

        /* Remember / Forgot row */
        .login-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }

        .login-remember {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .login-remember-box {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1.5px solid rgba(59, 130, 246, 0.25);
          background: rgba(15, 23, 42, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .login-remember-box.checked {
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          border-color: #3b82f6;
        }

        .login-remember-text {
          font-size: 13px;
          color: #94a3b8;
        }

        .login-forgot {
          font-size: 12.5px;
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }

        .login-forgot:hover {
          color: #60a5fa;
          text-decoration: underline;
        }

        /* Submit Button */
        .login-btn {
          width: 100%;
          padding: 13px 24px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #059669, #10b981, #34d399);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
          font-family: inherit;
          letter-spacing: 0.01em;
          position: relative;
          overflow: hidden;
        }

        .login-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }

        .login-btn:hover::before {
          transform: translateX(100%);
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-btn-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* Quick Demo */
        .login-demo-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 28px 0 18px;
        }

        .login-demo-divider::before,
        .login-demo-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.15), transparent);
        }

        .login-demo-label {
          font-size: 11px;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 5px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          white-space: nowrap;
        }

        .login-demo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .login-demo-btn {
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .login-demo-btn:hover {
          transform: translateY(-1px);
        }

        .login-footer {
          margin-top: 28px;
          text-align: center;
        }

        .login-footer-link {
          font-size: 13px;
          color: #64748b;
        }

        .login-footer-link a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
          margin-left: 4px;
        }

        .login-footer-link a:hover {
          text-decoration: underline;
        }

        .login-copyright {
          margin-top: 18px;
          font-size: 11.5px;
          color: #334155;
          text-align: center;
        }

        /* ─── Right Panel ─── */
        .login-right {
          flex: 1;
          height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-right-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #0c1a3a 0%, #0f2460 25%, #1a3a7a 50%, #0d2b5e 75%, #081830 100%);
        }

        .login-right-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 30% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 80%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
        }

        /* Grid pattern */
        .login-right-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(59, 130, 246, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
        }

        /* Floating orbs */
        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: float-orb 8s ease-in-out infinite;
        }

        .login-orb-1 {
          width: 300px;
          height: 300px;
          background: rgba(59, 130, 246, 0.12);
          top: 10%;
          right: 10%;
          animation-delay: 0s;
        }

        .login-orb-2 {
          width: 250px;
          height: 250px;
          background: rgba(6, 182, 212, 0.1);
          bottom: 15%;
          left: 15%;
          animation-delay: -3s;
        }

        .login-orb-3 {
          width: 200px;
          height: 200px;
          background: rgba(99, 102, 241, 0.08);
          top: 50%;
          left: 50%;
          animation-delay: -5s;
        }

        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.05); }
          66% { transform: translate(-15px, 20px) scale(0.95); }
        }

        /* Floating particles */
        .login-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(59, 130, 246, 0.5);
          border-radius: 50%;
          animation: float-particle linear infinite;
        }

        @keyframes float-particle {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; transform: translateY(90vh) scale(1); }
          90% { opacity: 0.6; }
          100% { transform: translateY(-10vh) scale(0.5); opacity: 0; }
        }

        /* Center content */
        .login-right-content {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 500px;
          padding: 40px;
        }

        /* Robot mascot container */
        .login-robot {
          width: 220px;
          height: 220px;
          margin: 0 auto 36px;
          position: relative;
          animation: float-robot 6s ease-in-out infinite;
        }

        @keyframes float-robot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
        }

        .login-robot-body {
          width: 160px;
          height: 160px;
          margin: 0 auto;
          background: linear-gradient(180deg, #1e3a5f 0%, #0f2440 100%);
          border-radius: 32px;
          border: 2px solid rgba(59, 130, 246, 0.25);
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(59, 130, 246, 0.15);
        }

        .login-robot-body::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 20%;
          right: 20%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, transparent);
        }

        /* Robot face */
        .login-robot-face {
          position: absolute;
          top: 30px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 24px;
        }

        .login-robot-eye {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), inset 0 -3px 6px rgba(0,0,0,0.3);
          animation: blink-eye 4s ease-in-out infinite;
          position: relative;
        }

        .login-robot-eye::after {
          content: '';
          position: absolute;
          top: 6px;
          left: 8px;
          width: 8px;
          height: 8px;
          background: rgba(255,255,255,0.8);
          border-radius: 50%;
        }

        @keyframes blink-eye {
          0%, 44%, 48%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(0.1); }
        }

        .login-robot-mouth {
          position: absolute;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          width: 50px;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
        }

        .login-robot-visor {
          position: absolute;
          top: 20px;
          left: 15px;
          right: 15px;
          height: 50px;
          border-radius: 25px;
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.15);
        }

        /* Robot antenna */
        .login-robot-antenna {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 20px;
          background: linear-gradient(180deg, #3b82f6, rgba(59, 130, 246, 0.3));
        }

        .login-robot-antenna::after {
          content: '';
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
          animation: pulse-antenna 2s ease-in-out infinite;
        }

        @keyframes pulse-antenna {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.9), 0 0 60px rgba(59, 130, 246, 0.3); }
        }

        /* Shield overlay on robot */
        .login-robot-shield {
          position: absolute;
          bottom: 25px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(59, 130, 246, 0.6);
        }

        /* Orbiting rings */
        .login-orbit {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 50%;
          animation: orbit 12s linear infinite;
        }

        .login-orbit-1 {
          width: 200px;
          height: 200px;
        }

        .login-orbit-2 {
          width: 260px;
          height: 260px;
          animation-direction: reverse;
          animation-duration: 18s;
          border-style: dashed;
        }

        .login-orbit-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
        }

        .login-orbit-1 .login-orbit-dot { top: -4px; left: 50%; }
        .login-orbit-2 .login-orbit-dot { bottom: -4px; right: 20%; }

        @keyframes orbit {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .login-right-title {
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }

        .login-right-title span {
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-right-desc {
          font-size: 15px;
          color: #94a3b8;
          line-height: 1.6;
          max-width: 380px;
          margin: 0 auto;
        }

        /* Features pills */
        .login-features {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 28px;
          flex-wrap: wrap;
        }

        .login-feature-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 500;
          color: #94a3b8;
          backdrop-filter: blur(10px);
        }

        .login-feature-pill svg {
          color: #3b82f6;
        }

        /* Error styling */
        .login-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          padding: 11px 14px;
          margin-bottom: 18px;
          font-size: 13px;
          color: #f87171;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .login-right { display: none; }
          .login-left {
            width: 100%;
            min-width: unset;
            max-width: 100%;
            border-right: none;
          }
        }

        @media (max-width: 480px) {
          .login-left {
            padding: 32px 24px;
          }
          .login-demo-grid {
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }
        }
      `}</style>

      <div className="login-page">
        {/* ─── LEFT: Form Panel ─── */}
        <div className="login-left">
          {/* Logo & Branding */}
          <div className="login-logo">
            <div className="login-logo-icon">
              <Shield size={24} color="white" strokeWidth={2.5} />
            </div>
            <span className="login-logo-text">AI CM</span>
          </div>

          <div className="login-subtitle">AI Complaint Management System</div>
          <div className="login-tagline">
            <span>Smart</span> • <span>Secure</span> • <span>Solution</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Employee ID / Email</label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" />
                <input
                  className="login-input"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  className="login-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="login-pass-toggle"
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`login-remember-box ${rememberMe ? 'checked' : ''}`}>
                  {rememberMe && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="login-remember-text">Remember Me</span>
              </label>
              <a href="/login/forgot" className="login-forgot">Forgot Password?</a>
            </div>

            {error && (
              <div className="login-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#f87171" strokeWidth="1.5"/>
                  <path d="M8 5v3M8 10.5v.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <div className="login-btn-spinner" />
              ) : (
                <>Login <ChevronRight size={18} /></>
              )}
            </button>
          </form>

          {/* Quick Demo Login */}
          <div className="login-demo-divider">
            <span className="login-demo-label">
              <Zap size={12} /> Quick Demo
            </span>
          </div>

          <div className="login-demo-grid">
            {[
              { role: 'admin',    label: 'Admin',      color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.18)' },
              { role: 'hr',       label: 'HR Manager',  color: '#06b6d4', bg: 'rgba(6,182,212,0.06)',  border: 'rgba(6,182,212,0.18)'  },
              { role: 'cmd',      label: 'CMD',          color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.18)' },
              { role: 'employee', label: 'Employee',    color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.18)' },
            ].map(({ role, label, color, bg, border }) => (
              <button
                key={role}
                onClick={() => quickLogin(role)}
                className="login-demo-btn"
                style={{ background: bg, color, borderColor: border }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="login-footer">
            <div className="login-footer-link">
              New organization?
              <a href="/signup">Create Organization</a>
            </div>
            <div className="login-copyright">
              © {new Date().getFullYear()} Your Organization. All rights reserved.
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Illustration Panel ─── */}
        <div className="login-right">
          <div className="login-right-bg" />
          <div className="login-right-grid" />

          {/* Floating orbs */}
          <div className="login-orb login-orb-1" />
          <div className="login-orb login-orb-2" />
          <div className="login-orb login-orb-3" />

          {/* Floating particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="login-particle"
              style={{
                left: `${5 + Math.random() * 90}%`,
                animationDuration: `${6 + Math.random() * 10}s`,
                animationDelay: `${Math.random() * 8}s`,
                width: `${2 + Math.random() * 4}px`,
                height: `${2 + Math.random() * 4}px`,
                background: ['rgba(59,130,246,0.5)', 'rgba(6,182,212,0.4)', 'rgba(99,102,241,0.4)', 'rgba(16,185,129,0.3)'][Math.floor(Math.random() * 4)],
              }}
            />
          ))}

          {/* Center Content */}
          <div className="login-right-content">
            {/* Robot Mascot */}
            <div className="login-robot">
              {/* Orbiting rings */}
              <div className="login-orbit login-orbit-1">
                <div className="login-orbit-dot" />
              </div>
              <div className="login-orbit login-orbit-2">
                <div className="login-orbit-dot" />
              </div>

              {/* Robot body */}
              <div className="login-robot-body">
                <div className="login-robot-antenna" />
                <div className="login-robot-visor" />
                <div className="login-robot-face">
                  <div className="login-robot-eye" />
                  <div className="login-robot-eye" />
                </div>
                <div className="login-robot-mouth" />
                <div className="login-robot-shield">
                  <Shield size={28} />
                </div>
              </div>
            </div>

            <h2 className="login-right-title">
              <span>AI-Powered</span><br />
              Smart Complaint Management
            </h2>
            <p className="login-right-desc">
              Faster Resolution, Better Workplace.<br />
              Intelligent routing, real-time analytics, and secure multi-tenant architecture.
            </p>

            {/* Feature pills */}
            <div className="login-features">
              <div className="login-feature-pill">
                <Sparkles size={13} /> AI Classification
              </div>
              <div className="login-feature-pill">
                <Shield size={13} /> Multi-Tenant
              </div>
              <div className="login-feature-pill">
                <Bot size={13} /> Smart Routing
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
