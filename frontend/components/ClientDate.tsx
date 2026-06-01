'use client';
import { useEffect, useState } from 'react';

interface ClientDateProps {
  date: string | Date | null | undefined;
  showTime?: boolean;
  dateOnly?: boolean;
  fallback?: string;
}

export default function ClientDate({ date, showTime = true, dateOnly = false, fallback = '-' }: ClientDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!date) return <>{fallback}</>;

  const d = new Date(date);
  
  if (!mounted) {
    // Return standard ISO format for SSR/initial render to keep it consistent
    return <span suppressHydrationWarning>{d.toISOString().slice(0, 10)}</span>;
  }

  try {
    let formatted = '';
    if (dateOnly) {
      formatted = d.toLocaleDateString();
    } else if (!showTime) {
      formatted = d.toLocaleDateString();
    } else {
      formatted = d.toLocaleString();
    }
    return <span suppressHydrationWarning>{formatted}</span>;
  } catch (e) {
    return <>{fallback}</>;
  }
}
