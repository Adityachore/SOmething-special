'use client';

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  CRITICAL: { label: '● CRITICAL', cls: 'badge badge-critical' },
  HIGH:     { label: '● HIGH',     cls: 'badge badge-high' },
  MEDIUM:   { label: '● MEDIUM',   cls: 'badge badge-medium' },
  LOW:      { label: '● LOW',      cls: 'badge badge-low' },
};

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  PENDING:              { label: 'Pending',              cls: 'badge status-pending' },
  IN_PROGRESS:          { label: 'In Progress',          cls: 'badge status-in_progress' },
  WAITING_FOR_EMPLOYEE: { label: 'Waiting for Employee', cls: 'badge status-waiting' },
  SOLVED:               { label: 'Resolved',             cls: 'badge status-solved' },
  CLOSED:               { label: 'Closed',               cls: 'badge status-closed' },
  REJECTED:             { label: 'Rejected',             cls: 'badge status-rejected' },
  WITHDRAWN:            { label: 'Withdrawn',            cls: 'badge status-withdrawn' },
  EXPIRED:              { label: 'Expired',              cls: 'badge status-expired' },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const s = PRIORITY_STYLES[priority] || { label: priority, cls: 'badge badge-low' };
  return <span className={s.cls}>{s.label}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { label: status, cls: 'badge status-pending' };
  return <span className={s.cls}>{s.label}</span>;
}

export function HRBadge({ sensitive }: { sensitive: boolean }) {
  if (!sensitive) return <span style={{ color:'#475569', fontSize:12 }}>—</span>;
  return (
    <span className="badge" style={{ background:'rgba(239,68,68,0.1)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)', fontSize:11 }}>
      🔒 HR
    </span>
  );
}
