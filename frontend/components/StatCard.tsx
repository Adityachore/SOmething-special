'use client';
import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: 'purple' | 'amber' | 'blue' | 'green' | 'red';
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
}

const COLOR_MAP = {
  purple: { icon:'rgba(16,185,129,0.15)', iconColor:'#34d399' },
  amber:  { icon:'rgba(245,158,11,0.15)',  iconColor:'#fbbf24' },
  blue:   { icon:'rgba(59,130,246,0.15)',  iconColor:'#60a5fa' },
  green:  { icon:'rgba(16,185,129,0.15)',  iconColor:'#34d399' },
  red:    { icon:'rgba(239,68,68,0.15)',   iconColor:'#f87171' },
};

export default function StatCard({ label, value, icon, color, trend, trendLabel, subtitle }: StatCardProps) {
  const c = COLOR_MAP[color];
  const isPos = trend !== undefined && trend >= 0;
  return (
    <div className={`stat-card ${color}`}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div>
          <p style={{ fontSize:12, fontWeight:500, color:'#64748b', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
          <p style={{ fontSize:28, fontWeight:700, color:'#f1f5f9', lineHeight:1, marginBottom:8 }}>{typeof value === 'number' ? value : value}</p>
          {trend !== undefined && (
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, fontWeight:600, color: isPos ? '#34d399' : '#f87171' }}>
                {isPos ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
                {Math.abs(trend)}%
              </div>
              {trendLabel && <span style={{ fontSize:12, color:'#475569' }}>{trendLabel}</span>}
            </div>
          )}
          {subtitle && <p style={{ fontSize:12, color:'#475569', marginTop:4 }}>{subtitle}</p>}
        </div>
        <div style={{
          width:44, height:44, borderRadius:12, flexShrink:0,
          background:c.icon, display:'flex', alignItems:'center', justifyContent:'center',
          color:c.iconColor
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
