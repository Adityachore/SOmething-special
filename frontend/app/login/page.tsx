"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Shield,
  Eye,
  EyeOff,
  Zap,
  Mail,
  Lock,
  ChevronRight,
  Search,
  Bell,
  LayoutDashboard,
  FileText,
  FilePlus,
  BarChart2,
  BellRing,
  BookOpen,
  Settings,
  MoreVertical,
  User,
  BrainCircuit,
  FolderOpen,
  CheckCircle2,
  Users,
  Building,
  Bot
} from "lucide-react";

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const quickLogin = (role: string) => {
    const map: Record<string, [string, string]> = {
      admin: ["admin@demo.com", "Admin@1234"],
      hr: ["hr@demo.com", "Hr@1234"],
      cmd: ["cmd@demo.com", "Cmd@1234"],
      employee: ["employee@demo.com", "Emp@1234"],
    };
    setEmail(map[role][0]);
    setPassword(map[role][1]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Invalid email or password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#050a18",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root {
          --primary-bg: #030712;
          --panel-bg: #0b1120;
          --border-color: rgba(59, 130, 246, 0.1);
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --accent-blue: #3b82f6;
          --accent-green: #10b981;
        }

        .login-page {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--primary-bg);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* ─── Left Panel ─── */
        .login-left {
          width: 440px;
          min-width: 400px;
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px;
          background: var(--panel-bg);
          border-right: 1px solid var(--border-color);
          position: relative;
          z-index: 10;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .login-logo-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        }

        .login-logo-text {
          font-size: 26px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.02em;
        }

        .login-logo-text span {
          color: #38bdf8;
        }

        .login-subtitle {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .login-tagline {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .login-tagline span {
          color: #3b82f6;
          font-weight: 500;
        }

        .login-field {
          margin-bottom: 24px;
        }

        .login-field label {
          display: block;
          font-size: 11px;
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
          color: #64748b;
          pointer-events: none;
        }

        .login-input {
          width: 100%;
          padding: 14px 14px 14px 44px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }

        .login-input:focus {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(15, 23, 42, 0.8);
        }

        .login-pass-toggle {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
        }

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
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.2);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-remember-box.checked {
          background: #3b82f6;
          border-color: #3b82f6;
        }

        .login-remember-text {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .login-forgot {
          font-size: 13px;
          color: #3b82f6;
          text-decoration: none;
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(90deg, #10b981, #34d399);
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
        }

        .login-demo-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 32px 0 20px;
        }
        .login-demo-divider::before,
        .login-demo-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.05);
        }
        .login-demo-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .login-demo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .login-demo-btn {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .login-demo-btn:hover {
          background: rgba(255,255,255,0.03);
          color: white;
        }

        .login-footer {
          margin-top: 40px;
          text-align: center;
          font-size: 13px;
        }
        .login-footer-link {
          color: var(--text-secondary);
          margin-bottom: 24px;
        }
        .login-footer-link a {
          color: #3b82f6;
          text-decoration: none;
          margin-left: 6px;
        }
        .login-copyright {
          color: #475569;
          font-size: 12px;
        }

        /* ─── Right Panel ─── */
        .login-right {
          flex: 1;
          position: relative;
          background: linear-gradient(180deg, #020617 0%, #0f172a 100%);
          overflow-y: auto;
          overflow-x: hidden;
          padding: 60px;
          display: flex;
          flex-direction: column;
          background-image: 
            radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.08), transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(59, 130, 246, 0.05), transparent 25%);
        }

        /* Dotted grid overlay */
        .login-right::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 24px 24px;
          z-index: 0;
          pointer-events: none;
        }

        .right-content-wrapper {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 60px;
        }

        /* Top Header Area */
        .header-content {
          max-width: 600px;
        }
        .header-title {
          font-size: 32px;
          font-weight: 700;
          color: white;
          margin-bottom: 12px;
        }
        .header-subtitle {
          font-size: 14px;
          font-weight: 500;
          color: #60a5fa;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-subtitle span {
          color: #60a5fa;
        }
        .header-subtitle .dot {
          color: #475569;
        }
        .header-desc {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.6;
        }

        /* Main Top Section (Text + Dashboard Mockup) */
        .top-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
        }

        /* Dashboard Mockup Container */
        .mockup-container {
          position: absolute;
          top: -20px;
          right: -80px;
          width: 800px;
          height: 520px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1);
          display: flex;
          overflow: hidden;
          transform: perspective(1000px) rotateY(-5deg) scale(0.9);
          transform-origin: right center;
          z-index: 5;
        }

        /* Dashboard Sidebar */
        .mockup-sidebar {
          width: 220px;
          background: #0f172a;
          padding: 20px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #1e293b;
        }
        .mockup-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 30px;
        }
        .mockup-logo-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mockup-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          color: #94a3b8;
          font-size: 13px;
          margin-bottom: 4px;
        }
        .mockup-menu-item.active {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        /* Dashboard Main Area */
        .mockup-main {
          flex: 1;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }
        .mockup-header {
          height: 60px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
        }
        .mockup-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          padding: 8px 16px;
          border-radius: 20px;
          width: 250px;
          color: #94a3b8;
          font-size: 12px;
        }
        .mockup-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .mockup-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e2e8f0;
          overflow: hidden;
        }
        .mockup-user-info {
          display: flex;
          flex-direction: column;
        }
        .mockup-user-name { font-size: 12px; font-weight: 600; color: #0f172a; }
        .mockup-user-role { font-size: 11px; color: #64748b; }

        .mockup-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
        }

        .mockup-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .mockup-stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }
        .mockup-stat-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .mockup-stat-title { font-size: 11px; color: #64748b; font-weight: 500; }
        .mockup-stat-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .mockup-stat-value { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .mockup-stat-trend { font-size: 11px; display: flex; align-items: center; gap: 4px; }
        .trend-up { color: #10b981; }
        .trend-down { color: #ef4444; }

        .mockup-middle {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }
        .mockup-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }
        .mockup-card-title {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* Fake Chart */
        .mockup-chart-area {
          height: 120px;
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: 10%;
          padding-top: 20px;
        }
        .chart-line {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 100' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,80 Q40,60 80,70 T160,40 T240,60 T320,20 T400,30' fill='none' stroke='%233b82f6' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M0,80 Q40,60 80,70 T160,40 T240,60 T320,20 T400,30 L400,100 L0,100 Z' fill='rgba(59,130,246,0.1)' /%3E%3C/svg%3E");
          background-size: 100% 100%;
          background-repeat: no-repeat;
          border-bottom: 1px solid #e2e8f0;
        }

        /* Fake Pie Chart */
        .mockup-pie-area {
          height: 120px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .pie-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: conic-gradient(#3b82f6 0% 40%, #10b981 40% 65%, #f59e0b 65% 85%, #ef4444 85% 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pie-inner {
          width: 60px;
          height: 60px;
          background: white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .pie-inner span { font-size: 14px; font-weight: 700; color: #0f172a; }
        .pie-inner small { font-size: 9px; color: #64748b; }
        
        .pie-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .legend-item {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
        }
        .legend-dot { width: 6px; height: 6px; border-radius: 50%; margin-right: 6px; display: inline-block;}

        /* Fake Table Row */
        .mockup-bottom {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }
        .mockup-table { width: 100%; border-collapse: collapse; }
        .mockup-table th { text-align: left; font-size: 10px; color: #94a3b8; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;}
        .mockup-table td { font-size: 11px; color: #334155; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        
        .mockup-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 500;
        }

        /* How AI Works Section */
        .how-ai-works {
          margin-top: 200px; /* Space for absolute mockup */
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: white;
          margin-bottom: 24px;
        }
        .flowchart {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          position: relative;
        }
        /* Flowchart connection line */
        .flowchart::before {
          content: "";
          position: absolute;
          top: 24px;
          left: 40px;
          right: 40px;
          height: 1px;
          border-top: 1px dashed rgba(59, 130, 246, 0.4);
          z-index: 0;
        }
        .flow-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          z-index: 1;
          width: 110px;
        }
        .flow-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .flow-title {
          font-size: 12px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 4px;
        }
        .flow-desc {
          font-size: 10px;
          color: #64748b;
          line-height: 1.4;
        }

        /* Key Features Section */
        .key-features {
          margin-top: 40px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }
        .feature-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: all 0.2s;
        }
        .feature-card:hover {
          background: rgba(30, 58, 138, 0.2);
          border-color: rgba(59, 130, 246, 0.4);
        }
        .feature-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(59, 130, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          flex-shrink: 0;
        }
        .feature-text h4 {
          font-size: 12px;
          font-weight: 600;
          color: white;
          margin: 0 0 4px 0;
        }
        .feature-text p {
          font-size: 10px;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        /* Responsive Adjustments */
        @media (max-width: 1200px) {
          .mockup-container {
            right: -200px;
          }
        }
        @media (max-width: 1024px) {
          .login-right { display: none; }
          .login-left {
            width: 100%;
            min-width: unset;
            border-right: none;
            padding: 24px;
          }
        }
      `}</style>

      <div className="login-page">
        {/* ─── LEFT: Form Panel ─── */}
        <div className="login-left">
          <div className="login-logo">
            <div className="login-logo-icon">
              <Shield size={22} color="white" strokeWidth={2.5} />
            </div>
            <span className="login-logo-text">AI <span>CM</span></span>
          </div>

          <div className="login-subtitle">AI Complaint Management System</div>
          <div className="login-tagline">
            <span>Smart</span> • <span>Secure</span> • <span>Solution</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Employee ID / Email</label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" />
                <input
                  className="login-input"
                  type="email"
                  placeholder="adityachore20@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  className="login-input"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="login-pass-toggle"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`login-remember-box ${rememberMe ? "checked" : ""}`}>
                  {rememberMe && <CheckCircle2 size={12} color="white" />}
                </div>
                <span className="login-remember-text">Remember Me</span>
              </label>
              <a href="/login/forgot" className="login-forgot">
                Forgot Password?
              </a>
            </div>

            {error && (
              <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"} <ChevronRight size={18} />
            </button>
          </form>

          <div className="login-demo-divider">
            <span className="login-demo-label">
              <Zap size={12} color="#f59e0b" /> QUICK DEMO
            </span>
          </div>

          <div className="login-demo-grid">
            <button className="login-demo-btn" onClick={() => quickLogin("admin")}>
              <span style={{ color: "#f59e0b" }}>●</span> Admin
            </button>
            <button className="login-demo-btn" onClick={() => quickLogin("hr")}>
              <span style={{ color: "#38bdf8" }}>●</span> HR Manager
            </button>
            <button className="login-demo-btn" onClick={() => quickLogin("cmd")}>
              <span style={{ color: "#3b82f6" }}>●</span> CMD
            </button>
            <button className="login-demo-btn" onClick={() => quickLogin("employee")}>
              <span style={{ color: "#10b981" }}>●</span> Employee
            </button>
          </div>

          <div className="login-footer">
            <div className="login-footer-link">
              New organization? <a href="/signup">Create Organization</a>
            </div>
            <div className="login-copyright">
              © 2026 Your Organization. All rights reserved.
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Presentation Panel ─── */}
        <div className="login-right">
          <div className="right-content-wrapper">
            
            <div className="top-section">
              <div className="header-content">
                <h2 className="header-title">Intelligent Complaint Management</h2>
                <div className="header-subtitle">
                  <span>AI-Powered</span> <span className="dot">•</span> <span>Automated</span> <span className="dot">•</span> <span>Analytics-Driven</span>
                </div>
                <p className="header-desc">
                  Experience the next generation of complaint management with AI-driven classification, smart routing, and real-time analytics.
                </p>
              </div>

              {/* DASHBOARD MOCKUP */}
              <div className="mockup-container">
                <div className="mockup-sidebar">
                  <div className="mockup-logo">
                    <div className="mockup-logo-icon"><Shield size={16} color="white"/></div>
                    AI CM
                  </div>
                  <div className="mockup-menu-item active"><LayoutDashboard size={14} /> Dashboard</div>
                  <div className="mockup-menu-item"><FilePlus size={14} /> Raise Complaint</div>
                  <div className="mockup-menu-item"><FileText size={14} /> My Complaints</div>
                  <div className="mockup-menu-item"><FolderOpen size={14} /> All Complaints</div>
                  <div className="mockup-menu-item"><BarChart2 size={14} /> Reports & Analytics</div>
                  <div className="mockup-menu-item"><BellRing size={14} /> Notifications <span style={{background:'#3b82f6', color:'white', fontSize:10, padding:'2px 6px', borderRadius:10, marginLeft:'auto'}}>9</span></div>
                  <div className="mockup-menu-item"><BookOpen size={14} /> Knowledge Base</div>
                  <div className="mockup-menu-item" style={{marginTop: 'auto'}}><Settings size={14} /> Settings</div>
                </div>

                <div className="mockup-main">
                  <div className="mockup-header">
                    <div className="mockup-search">
                      <Search size={14} /> Search (Ctrl + /)
                    </div>
                    <div className="mockup-user">
                      <div style={{position:'relative'}}>
                        <Bell size={16} color="#64748b"/>
                        <div style={{position:'absolute', top:-2, right:-2, width:6, height:6, background:'#ef4444', borderRadius:'50%'}} />
                      </div>
                      <div className="mockup-avatar"></div>
                      <div className="mockup-user-info">
                        <span className="mockup-user-name">Rahul Sharma</span>
                        <span className="mockup-user-role">HR Manager</span>
                      </div>
                    </div>
                  </div>

                  <div className="mockup-content">
                    <div className="mockup-stats">
                      <div className="mockup-stat-card">
                        <div className="mockup-stat-header">
                          <span className="mockup-stat-title">Total Complaints</span>
                          <div className="mockup-stat-icon" style={{background:'rgba(59,130,246,0.1)', color:'#3b82f6'}}><FileText size={12}/></div>
                        </div>
                        <div className="mockup-stat-value">1,245</div>
                        <div className="mockup-stat-trend trend-up">↑ +12.5% <span style={{color:'#94a3b8', marginLeft:4}}>vs last month</span></div>
                      </div>
                      <div className="mockup-stat-card">
                        <div className="mockup-stat-header">
                          <span className="mockup-stat-title">Open Complaints</span>
                          <div className="mockup-stat-icon" style={{background:'rgba(245,158,11,0.1)', color:'#f59e0b'}}><FolderOpen size={12}/></div>
                        </div>
                        <div className="mockup-stat-value">342</div>
                        <div className="mockup-stat-trend trend-up">↑ +8.2% <span style={{color:'#94a3b8', marginLeft:4}}>vs last month</span></div>
                      </div>
                      <div className="mockup-stat-card">
                        <div className="mockup-stat-header">
                          <span className="mockup-stat-title">Under Investigation</span>
                          <div className="mockup-stat-icon" style={{background:'rgba(168,85,247,0.1)', color:'#a855f7'}}><Search size={12}/></div>
                        </div>
                        <div className="mockup-stat-value">123</div>
                        <div className="mockup-stat-trend trend-down">↓ -5.4% <span style={{color:'#94a3b8', marginLeft:4}}>vs last month</span></div>
                      </div>
                      <div className="mockup-stat-card">
                        <div className="mockup-stat-header">
                          <span className="mockup-stat-title">Resolved</span>
                          <div className="mockup-stat-icon" style={{background:'rgba(16,185,129,0.1)', color:'#10b981'}}><CheckCircle2 size={12}/></div>
                        </div>
                        <div className="mockup-stat-value">980</div>
                        <div className="mockup-stat-trend trend-up">↑ +15.7% <span style={{color:'#94a3b8', marginLeft:4}}>vs last month</span></div>
                      </div>
                    </div>

                    <div className="mockup-middle">
                      <div className="mockup-card">
                        <div className="mockup-card-title">
                          Complaint Analytics
                          <div style={{fontSize:10, color:'#64748b', display:'flex', alignItems:'center', gap:4, border:'1px solid #e2e8f0', padding:'4px 8px', borderRadius:6}}>Last 6 Months v</div>
                        </div>
                        <div className="mockup-chart-area">
                          <div className="chart-line"></div>
                        </div>
                      </div>
                      <div className="mockup-card">
                        <div className="mockup-card-title">AI Classification (This Month)</div>
                        <div className="mockup-pie-area">
                          <div className="pie-circle">
                            <div className="pie-inner">
                              <span>94%</span>
                              <small>Accuracy</small>
                            </div>
                          </div>
                          <div className="pie-legend">
                            <div className="legend-item"><span style={{display:'flex', alignItems:'center'}}><span className="legend-dot" style={{background:'#3b82f6'}}></span> HR Related</span> <span>420</span></div>
                            <div className="legend-item"><span style={{display:'flex', alignItems:'center'}}><span className="legend-dot" style={{background:'#10b981'}}></span> IT Related</span> <span>310</span></div>
                            <div className="legend-item"><span style={{display:'flex', alignItems:'center'}}><span className="legend-dot" style={{background:'#f59e0b'}}></span> Payroll</span> <span>210</span></div>
                            <div className="legend-item"><span style={{display:'flex', alignItems:'center'}}><span className="legend-dot" style={{background:'#ef4444'}}></span> Workplace</span> <span>180</span></div>
                            <div className="legend-item"><span style={{display:'flex', alignItems:'center'}}><span className="legend-dot" style={{background:'#94a3b8'}}></span> Others</span> <span>125</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mockup-bottom">
                      <div className="mockup-card">
                        <div className="mockup-card-title">
                          Recent Complaints
                          <span style={{fontSize:10, color:'#3b82f6', background:'rgba(59,130,246,0.1)', padding:'2px 8px', borderRadius:4}}>View All</span>
                        </div>
                        <table className="mockup-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Subject</th>
                              <th>Category (AI)</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>#CM-1250</td>
                              <td>Delay in Salary</td>
                              <td><span className="mockup-badge" style={{background:'#f1f5f9', color:'#475569'}}>Payroll</span></td>
                              <td><span className="mockup-badge" style={{background:'rgba(239,68,68,0.1)', color:'#ef4444'}}>High</span></td>
                              <td><span className="mockup-badge" style={{background:'rgba(245,158,11,0.1)', color:'#f59e0b'}}>Under Review</span></td>
                              <td>20 May 2026</td>
                            </tr>
                            <tr>
                              <td>#CM-1249</td>
                              <td>Harassment Issue</td>
                              <td><span className="mockup-badge" style={{background:'#f1f5f9', color:'#475569'}}>HR Related</span></td>
                              <td><span className="mockup-badge" style={{background:'rgba(239,68,68,0.1)', color:'#ef4444'}}>High</span></td>
                              <td><span className="mockup-badge" style={{background:'rgba(168,85,247,0.1)', color:'#a855f7'}}>In Progress</span></td>
                              <td>19 May 2026</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mockup-card">
                        <div className="mockup-card-title">Resolution Rate</div>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'center', marginTop:10}}>
                           <div style={{width: 100, height: 50, overflow:'hidden', position:'relative', borderBottom:'1px solid #e2e8f0'}}>
                              <div style={{width:100, height:100, borderRadius:'50%', border:'10px solid #f1f5f9', borderTopColor:'#10b981', borderRightColor:'#10b981', transform:'rotate(-45deg)'}}></div>
                              <div style={{position:'absolute', bottom:0, left:0, right:0, textAlign:'center', fontWeight:700, color:'#0f172a'}}>92%</div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* How AI Works */}
            <div className="how-ai-works">
              <h3 className="section-title">How AI Works</h3>
              <div className="flowchart">
                <div className="flow-step">
                  <div className="flow-icon-wrap" style={{borderColor:'rgba(16,185,129,0.3)', color:'#10b981'}}>
                    <User size={20} />
                  </div>
                  <div className="flow-title">Submit Complaint</div>
                  <div className="flow-desc">Employee raises a complaint</div>
                </div>
                <div className="flow-step">
                  <div className="flow-icon-wrap" style={{borderColor:'rgba(59,130,246,0.3)', color:'#3b82f6'}}>
                    <BrainCircuit size={20} />
                  </div>
                  <div className="flow-title">AI Analysis</div>
                  <div className="flow-desc">AI analyzes text and content</div>
                </div>
                <div className="flow-step">
                  <div className="flow-icon-wrap" style={{borderColor:'rgba(168,85,247,0.3)', color:'#a855f7'}}>
                    <FolderOpen size={20} />
                  </div>
                  <div className="flow-title">Category Detection</div>
                  <div className="flow-desc">Automatically detects category</div>
                </div>
                <div className="flow-step">
                  <div className="flow-icon-wrap" style={{borderColor:'rgba(245,158,11,0.3)', color:'#f59e0b'}}>
                    <Zap size={20} />
                  </div>
                  <div className="flow-title">Priority Assignment</div>
                  <div className="flow-desc">AI assigns priority based on rules</div>
                </div>
                <div className="flow-step">
                  <div className="flow-icon-wrap" style={{borderColor:'rgba(6,182,212,0.3)', color:'#06b6d4'}}>
                    <Users size={20} />
                  </div>
                  <div className="flow-title">Smart Routing</div>
                  <div className="flow-desc">Automatically routed to right investigator</div>
                </div>
                <div className="flow-step">
                  <div className="flow-icon-wrap" style={{borderColor:'rgba(59,130,246,0.3)', background:'#3b82f6', color:'white'}}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="flow-title">Resolution Tracking</div>
                  <div className="flow-desc">Track progress till resolution</div>
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="key-features">
              <h3 className="section-title">Key Features</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon"><Bot size={16}/></div>
                  <div className="feature-text">
                    <h4>AI Classification</h4>
                    <p>Smart category detection</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><Building size={16}/></div>
                  <div className="feature-text">
                    <h4>Multi-Tenant</h4>
                    <p>Support for multiple organizations</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><Users size={16}/></div>
                  <div className="feature-text">
                    <h4>Role-Based Access</h4>
                    <p>Granular role & permissions</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><BarChart2 size={16}/></div>
                  <div className="feature-text">
                    <h4>Real-Time Analytics</h4>
                    <p>Live dashboards & insights</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><Shield size={16}/></div>
                  <div className="feature-text">
                    <h4>Secure & Compliant</h4>
                    <p>Data security & privacy compliant</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
