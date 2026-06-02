'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { Settings, Bell, Brain, HardDrive, Globe, Shield, Database, Server } from 'lucide-react';

const SECTIONS = [
  {
    title: 'General Settings',
    icon: <Globe size={16}/>,
    items: [
      { label: 'Application Name', value: 'AI Complaint Analyzer' },
      { label: 'Tenant Mode', value: 'Multi-tenant' },
      { label: 'Default Language', value: 'English' },
      { label: 'Session Timeout', value: '30 minutes' },
    ],
  },
  {
    title: 'Notification Settings',
    icon: <Bell size={16}/>,
    items: [
      { label: 'Email Notifications', value: 'Enabled' },
      { label: 'SMTP Provider', value: 'Configured' },
      { label: 'Real-time WebSocket', value: 'Enabled' },
      { label: 'Digest Frequency', value: 'Daily' },
    ],
  },
  {
    title: 'AI Configuration',
    icon: <Brain size={16}/>,
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
    items: [
      { label: 'Database', value: 'PostgreSQL + pgvector' },
      { label: 'Cache', value: 'Redis' },
      { label: 'Task Queue', value: 'Celery + Redis' },
      { label: 'File Storage', value: 'Local (Docker volume)' },
    ],
  },
];

export default function AdminSettings() {
  return (
    <DashboardLayout title="Settings">
      <div style={{ maxWidth: 720, display:'flex', flexDirection:'column', gap:20 }}>
        <div className="info-box">
          <p style={{ fontSize:13, color:'#94a3b8' }}>
            Settings are configured via environment variables. Contact your system administrator to modify these values.
          </p>
        </div>

        {SECTIONS.map(section => (
          <div key={section.title} className="glass" style={{ padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'rgba(16,185,129,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#34d399' }}>
                {section.icon}
              </div>
              <h3 style={{ fontSize:15, fontWeight:600, color:'#f1f5f9' }}>{section.title}</h3>
            </div>
            {section.items.map((item, i) => (
              <div key={item.label} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 0',
                borderBottom: i < section.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
              }}>
                <span style={{ fontSize:13, color:'#94a3b8' }}>{item.label}</span>
                <span style={{ fontSize:13, fontWeight:500, color:'#e2e8f0', background:'rgba(255,255,255,0.04)', padding:'3px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.06)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
