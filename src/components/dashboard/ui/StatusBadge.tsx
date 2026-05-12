export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'archived';

const STYLES: Record<LeadStatus, string> = {
  new:       'bg-sky-950/60 text-sky-300 border-sky-800/40',
  contacted: 'bg-amber-950/60 text-amber-300 border-amber-800/40',
  qualified: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40',
  closed:    'bg-[#1f1e1c] text-[#8c8880] border-white/10',
  archived:  'bg-transparent text-[#5a5856] border-white/[0.06]',
};

const LEFT_BORDER: Record<LeadStatus, string> = {
  new:       'border-l-sky-400',
  contacted: 'border-l-amber-400',
  qualified: 'border-l-emerald-400',
  closed:    'border-l-[#5a5856]',
  archived:  'border-l-[#3a3836]',
};

const LABEL: Record<LeadStatus, string> = {
  new:       'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  closed:    'Closed',
  archived:  'Archived',
};

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide border ${STYLES[status]} ${className}`}
    >
      {LABEL[status]}
    </span>
  );
}

export { LEFT_BORDER };
