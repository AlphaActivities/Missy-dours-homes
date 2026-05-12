export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'archived';

const STYLES: Record<LeadStatus, string> = {
  new:       'bg-[rgba(30,54,80,0.55)] text-[#9ec5e0] border-[rgba(120,175,215,0.25)]',
  contacted: 'bg-[rgba(60,44,18,0.55)] text-[#c8a96e] border-[rgba(196,164,106,0.28)]',
  qualified: 'bg-[rgba(18,52,40,0.55)] text-[#86c9a8] border-[rgba(110,185,155,0.25)]',
  closed:    'bg-[rgba(40,36,32,0.6)] text-[#a89880] border-[rgba(168,152,128,0.2)]',
  archived:  'bg-[rgba(255,255,255,0.03)] text-[#5a5856] border-white/[0.07]',
};

const LEFT_BORDER: Record<LeadStatus, string> = {
  new:       'border-l-[#7aafd4]',
  contacted: 'border-l-[#c4a46a]',
  qualified: 'border-l-[#7dbfa0]',
  closed:    'border-l-[#7a6e62]',
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
