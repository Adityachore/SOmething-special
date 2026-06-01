'use client';

// Re-export all recharts components from a client-only module.
// Since this file is 'use client', Next.js won't attempt to SSR it.
// This avoids hydration mismatches from recharts accessing window/document.

export {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
