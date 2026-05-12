import { ReactNode } from 'react';

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  style?: React.CSSProperties;
}

export default function DashboardCard({ children, className = '', noPadding = false, style }: DashboardCardProps) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${noPadding ? '' : 'p-0'} ${className}`}
      style={{
        background: 'var(--ds-bg-raised)',
        boxShadow: 'var(--ds-shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
