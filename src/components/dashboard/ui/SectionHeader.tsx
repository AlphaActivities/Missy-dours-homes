import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
}

export default function SectionHeader({ title, subtitle, action, compact = false }: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${compact ? "mb-0" : "mb-6"}`}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--ds-text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-sm mt-0.5 ${compact ? "whitespace-nowrap" : ""}`} style={{ color: '#f5f5f5' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
