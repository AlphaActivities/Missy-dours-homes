import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
}

export default function SectionHeader({ title, subtitle, action, compact = false }: SectionHeaderProps) {
  return (
    <div className={`flex justify-between gap-3 ${compact ? "flex-col sm:flex-row sm:items-start mb-0" : "items-start mb-6"}`}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--ds-text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: '#f5f5f5' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className={compact ? "w-full min-w-0 sm:w-auto sm:shrink-0" : "shrink-0"}>{action}</div>}
    </div>
  );
}
